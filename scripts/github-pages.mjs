import { execFileSync } from 'node:child_process';

// 인증은 Windows Git Credential Manager에서 메모리로만 받는다.
// 토큰은 인수·파일·로그·저장소에 기록하지 않는다.
let credential;
try {
  const result = execFileSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
    stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000,
  });
  const fields = Object.fromEntries(result.trim().split(/\r?\n/).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
  if (!fields.password) throw new Error();
  credential = fields.password;
} catch { throw new Error('저장된 GitHub 인증을 사용할 수 없습니다.'); }

async function api(path, method = 'GET', data) {
  const response = await fetch(`https://api.github.com${path}`, {
    method, headers: { Authorization: `Bearer ${credential}`, Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'demon-king-pages-deployment' },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok && response.status !== 404) throw new Error(`GitHub API ${response.status}: ${body?.message ?? '요청 실패'}`);
  return { status: response.status, body };
}
const user = (await api('/user')).body;
if (user?.login !== 'jilzu001') throw new Error('기존 프로젝트와 GitHub 계정이 다릅니다.');
const repository = 'demon-king-life';
const route = `/repos/${user.login}/${repository}`;
const mode = process.argv[2] ?? 'inspect';
let repo = await api(route);
if (mode === 'inspect') {
  console.log(JSON.stringify({ account: user.login, repository, exists: repo.status === 200,
    ...(repo.status === 200 ? { url: repo.body.html_url, description: repo.body.description, push: repo.body.permissions?.push } : {}) }));
} else if (mode === 'create') {
  if (repo.status !== 404) throw new Error('이미 존재하는 저장소에는 생성 작업을 수행하지 않습니다.');
  repo = await api('/user/repos', 'POST', { name: repository, description: '가짜 마왕의 일생 — 연대기와 선택으로 진행하는 정적 웹게임',
    private: false, auto_init: false, has_wiki: false, has_projects: false });
  console.log(JSON.stringify({ url: repo.body.html_url, cloneUrl: repo.body.clone_url, branch: repo.body.default_branch }));
} else {
  if (repo.status !== 200) throw new Error('배포 저장소가 없습니다.');
  if (mode === 'enable-pages') {
    let pages = await api(`${route}/pages`);
    if (pages.status === 404) pages = await api(`${route}/pages`, 'POST', { build_type: 'workflow' });
    console.log(JSON.stringify({ url: pages.body.html_url, buildType: pages.body.build_type }));
  } else if (mode === 'status') {
    const runs = await api(`${route}/actions/runs?per_page=5`);
    const pages = await api(`${route}/pages`);
    console.log(JSON.stringify({ runs: runs.body.workflow_runs?.map(run => ({ id: run.id, sha: run.head_sha, status: run.status, conclusion: run.conclusion, url: run.html_url })),
      pages: { status: pages.body?.status, url: pages.body?.html_url } }));
  } else if (mode === 'logs') {
    const id = process.argv[3]; if (!/^\d+$/.test(id ?? '')) throw new Error('워크플로 실행 ID 필요');
    const jobs = await api(`${route}/actions/runs/${id}/jobs`);
    console.log(JSON.stringify(jobs.body.jobs?.map(job => ({ name: job.name, conclusion: job.conclusion, url: job.html_url,
      steps: job.steps?.map(step => ({ name: step.name, conclusion: step.conclusion })) })), null, 2));
  } else if (mode === 'job-log') {
    const id = process.argv[3]; if (!/^\d+$/.test(id ?? '')) throw new Error('워크플로 작업 ID 필요');
    const response = await fetch(`https://api.github.com${route}/actions/jobs/${id}/logs`, {
      headers: { Authorization: `Bearer ${credential}`, Accept: 'application/vnd.github+json', 'User-Agent': 'demon-king-pages-deployment' },
    });
    if (!response.ok) throw new Error(`작업 로그 요청 실패: HTTP${response.status}`);
    const log = await response.text();
    if (process.argv[4]) await (await import('node:fs/promises')).writeFile(process.argv[4], log);
    console.log(log.split('\n').slice(-120).join('\n'));
  } else if (mode === 'dispatch') {
    await api(`${route}/actions/workflows/pages.yml/dispatches`, 'POST', { ref: 'main' });
    console.log('배포 워크플로 실행 요청 완료');
  } else throw new Error('지원하지 않는 배포 명령');
}
credential = undefined;
