// 전달 ZIP의 tree-camera.mjs에서 검증된 좌표/줌/미니맵 수학을 타입과 함께 옮겼다.
export type Rect = { x: number; y: number; width: number; height: number };
export class TreeCamera {
  scale = 1; tx = 0; ty = 0;
  constructor(public minScale = .01, public maxScale = 2.2) {}
  worldFromScreen(x: number, y: number) { return { x: (x - this.tx) / this.scale, y: (y - this.ty) / this.scale }; }
  screenFromWorld(x: number, y: number) { return { x: x * this.scale + this.tx, y: y * this.scale + this.ty }; }
  panBy(dx: number, dy: number) { this.tx += dx; this.ty += dy; }
  zoomAt(x: number, y: number, factor: number) {
    const world = this.worldFromScreen(x, y);
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));
    this.tx = x - world.x * this.scale; this.ty = y - world.y * this.scale;
  }
  centerWorld(x: number, y: number, width: number, height: number) { this.tx = width / 2 - x * this.scale; this.ty = height / 2 - y * this.scale; }
  visibleWorldRect(width: number, height: number): Rect { const p = this.worldFromScreen(0, 0); return { ...p, width: width / this.scale, height: height / this.scale }; }
  fit(bounds: Rect, width: number, height: number, padding = 20) {
    if (width <= 0 || height <= 0 || bounds.width <= 0 || bounds.height <= 0) throw Error('잘못된 트리 크기');
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, (width - padding * 2) / bounds.width, (height - padding * 2) / bounds.height));
    this.centerWorld(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, width, height);
  }
}
export function minimapTransform(bounds: Rect, width: number, height: number, padding = 8) {
  const scale = Math.min((width - padding * 2) / bounds.width, (height - padding * 2) / bounds.height);
  const offsetX = (width - bounds.width * scale) / 2, offsetY = (height - bounds.height * scale) / 2;
  return {
    scale, project: (x: number, y: number) => ({ x: offsetX + (x - bounds.x) * scale, y: offsetY + (y - bounds.y) * scale }),
    unproject: (x: number, y: number) => ({ x: bounds.x + (x - offsetX) / scale, y: bounds.y + (y - offsetY) / scale }),
    rect: (r: Rect) => ({ x: offsetX + (r.x - bounds.x) * scale, y: offsetY + (r.y - bounds.y) * scale, width: r.width * scale, height: r.height * scale }),
  };
}
