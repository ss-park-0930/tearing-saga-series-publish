/**
 * Bug-report intake Worker for the Tear Ring Saga series patch site.
 *
 * Flow:
 *   1. CORS preflight + origin allowlist (single Pages domain, no `*`).
 *   2. Honeypot check (silent drop).
 *   3. Cloudflare Turnstile verification.
 *   4. Per-IP rate limit via KV (10 reports / hour).
 *   5. Upload attachments to R2, collect public URLs.
 *   6. Create a GitHub issue in the release repo matching the reported game.
 *
 * Bindings (wrangler.toml):
 *   BUCKET       R2 bucket for attachments
 *   RATE_LIMIT   KV namespace for per-IP counters
 * Secrets (wrangler secret put):
 *   TURNSTILE_SECRET, GH_TOKEN
 * Vars:
 *   ALLOWED_ORIGIN, R2_PUBLIC_BASE, GH_REPO_TRS1, GH_REPO_TRS2
 */

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 3600;
const MAX_FILE_BYTES = 30 * 1024 * 1024;
const MAX_FILES = 8;
const MAX_TOTAL_BYTES = MAX_FILE_BYTES * 4;

const GAME_LABELS = { trs1: '티어링 사가', trs2: '베르위크 사가' };

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed' }, 405, cors);
    }
    // Reject cross-origin posts outright — the browser sends Origin on POST.
    if (origin && origin !== env.ALLOWED_ORIGIN) {
      return json({ ok: false, error: 'Forbidden origin' }, 403, cors);
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return json({ ok: false, error: '폼 데이터를 읽지 못했습니다.' }, 400, cors);
    }

    // Honeypot: pretend success so bots don't learn they were caught.
    if ((form.get('website') ?? '').toString().trim() !== '') {
      return json({ ok: true }, 200, cors);
    }

    // --- Turnstile ---
    const turnstileOk = await verifyTurnstile(env, form.get('cf-turnstile-response'), request);
    if (!turnstileOk) {
      return json({ ok: false, error: '사람 확인에 실패했습니다. 다시 시도해 주세요.' }, 403, cors);
    }

    // --- Rate limit ---
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const limited = await checkRateLimit(env, ip);
    if (limited) {
      return json({ ok: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, 429, cors);
    }

    // --- Required fields ---
    const game = (form.get('game') ?? '').toString().trim();
    const version = (form.get('version') ?? '').toString().trim();
    const environment = (form.get('environment') ?? '').toString().trim();
    const summary = (form.get('summary') ?? '').toString().trim();
    const steps = (form.get('steps') ?? '').toString().trim();
    const frequency = (form.get('frequency') ?? '').toString().trim();
    const contact = (form.get('contact') ?? '').toString().trim();

    if (!GAME_LABELS[game]) {
      return json({ ok: false, error: '작품을 선택해 주세요.' }, 400, cors);
    }
    if (!version || !environment || !summary || !steps) {
      return json({ ok: false, error: '필수 항목을 모두 입력해 주세요.' }, 400, cors);
    }

    const repo = game === 'trs1' ? env.GH_REPO_TRS1 : env.GH_REPO_TRS2;
    if (!repo) {
      return json({ ok: false, error: '서버 설정 오류입니다.' }, 500, cors);
    }

    // --- Attachments to R2 ---
    const files = [...form.getAll('screenshots'), ...form.getAll('savefiles')].filter(
      (f) => f && typeof f === 'object' && 'arrayBuffer' in f && f.size > 0,
    );
    if (files.length > MAX_FILES) {
      return json({ ok: false, error: `첨부 파일은 최대 ${MAX_FILES}개까지 가능합니다.` }, 400, cors);
    }
    let totalBytes = 0;
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        return json({ ok: false, error: '파일 하나가 30MB를 초과했습니다.' }, 413, cors);
      }
      totalBytes += file.size;
    }
    if (totalBytes > MAX_TOTAL_BYTES) {
      return json({ ok: false, error: '첨부 파일 전체 용량이 너무 큽니다.' }, 413, cors);
    }

    const uploaded = [];
    try {
      for (const file of files) {
        const key = objectKey(game, file.name);
        await env.BUCKET.put(key, file.stream(), {
          httpMetadata: { contentType: file.type || 'application/octet-stream' },
        });
        uploaded.push({
          name: file.name || key,
          url: `${env.R2_PUBLIC_BASE.replace(/\/$/, '')}/${key}`,
        });
      }
    } catch {
      return json({ ok: false, error: '첨부 파일 업로드에 실패했습니다.' }, 502, cors);
    }

    // --- GitHub issue ---
    const body = buildIssueBody({ game, version, environment, steps, frequency, contact, uploaded, ip });
    try {
      const issueUrl = await createIssue(env, repo, {
        title: `[${version}] ${summary}`.slice(0, 250),
        body,
        labels: ['triage', 'user-report'],
      });
      return json({ ok: true, issueUrl }, 200, cors);
    } catch {
      return json({ ok: false, error: '제보 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, 502, cors);
    }
  },
};

function corsHeaders(origin, env) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (origin && origin === env.ALLOWED_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function json(payload, status, cors) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
  });
}

async function verifyTurnstile(env, token, request) {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token.toString());
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) body.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

async function checkRateLimit(env, ip) {
  const key = `rl:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const raw = await env.RATE_LIMIT.get(key);
  let count = 0;
  let resetAt = now + RATE_LIMIT_WINDOW_SECONDS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      // KV requires expiration >= now + 60s; a near-expired window is treated
      // as fresh so the put below never throws on the minimum-TTL rule.
      if (parsed.resetAt > now + 60) {
        count = parsed.count;
        resetAt = parsed.resetAt;
      }
    } catch {
      // treat corrupt entry as a fresh window
    }
  }
  if (count >= RATE_LIMIT_MAX) return true;
  await env.RATE_LIMIT.put(key, JSON.stringify({ count: count + 1, resetAt }), {
    expiration: resetAt,
  });
  return false;
}

function objectKey(game, name) {
  const safe = (name || 'file')
    .toString()
    .replace(/[^\w.\-]+/g, '_')
    .slice(-80);
  // crypto.randomUUID keeps keys collision-free without a timestamp path.
  return `reports/${game}/${crypto.randomUUID()}-${safe}`;
}

function buildIssueBody({ game, version, environment, steps, frequency, contact, uploaded, ip }) {
  const freqLabel = { always: '항상', sometimes: '가끔', once: '한 번만' }[frequency] ?? '미기재';
  const lines = [
    '> 방문자 버그 제보 폼에서 자동 생성된 이슈입니다. 검토 후 처리해 주세요.',
    '',
    `- **작품**: ${GAME_LABELS[game]} (${game})`,
    `- **패치 버전**: ${version}`,
    `- **사용 환경**: ${environment}`,
    `- **발생 빈도**: ${freqLabel}`,
    `- **연락처**: ${contact || '(미기재 / 익명)'}`,
    '',
    '### 재현 경로',
    '',
    steps,
    '',
  ];
  if (uploaded.length) {
    lines.push('### 첨부 파일', '');
    for (const item of uploaded) {
      lines.push(`- [${item.name}](${item.url})`);
    }
    lines.push('');
  }
  // Hashed IP: enough to spot repeat abusers, not the raw address.
  lines.push('---', `<sub>reporter: ${maskIp(ip)}</sub>`);
  return lines.join('\n');
}

function maskIp(ip) {
  if (!ip || ip === 'unknown') return 'unknown';
  const v4 = ip.split('.');
  if (v4.length === 4) return `${v4[0]}.${v4[1]}.x.x`;
  return `${ip.split(':').slice(0, 2).join(':')}::`;
}

async function createIssue(env, repo, issue) {
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'trs-bug-report-worker',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(issue),
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}`);
  }
  const data = await res.json();
  return data.html_url;
}
