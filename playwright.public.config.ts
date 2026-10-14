import { defineConfig } from '@playwright/test';
import local from './playwright.config';

// 같은 회귀 검사를 실제 배포 URL에서도 실행한다. 별도 로컬 서버는 띄우지 않는다.
const url = process.env.GAME_URL;
if (!url || !/^https?:\/\//.test(url)) throw new Error('GAME_URL에 검수할 게임 주소를 지정하세요.');
export default defineConfig({
  ...local,
  webServer: undefined,
  use: { ...local.use, baseURL: url },
  projects: local.projects?.filter(project => ['PC', '모바일-320'].includes(project.name ?? '')),
});
