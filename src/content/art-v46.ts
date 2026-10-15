import installed from './generated/art-assets-v46.json';

// 제작/시각 검수/설치가 끝난 실제 파일만 빌드 메타에 들어온다.
export function installedArtwork(path: string) { return installed.assets.find(asset => asset.path === path); }
export function playerAgeArtwork(age: number) {
  const id = age < 1 ? 'player-baby' : age < 6 ? 'player-toddler' : age < 12 ? 'player-school' : age < 18 ? 'player-child'
    : age < 35 ? 'canonical-protagonist' : age < 50 ? 'player-middle' : age < 65 ? 'player-mature' : 'player-old';
  return installed.assets.find(asset => asset.id === id);
}
