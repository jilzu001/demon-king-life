// CSS 다단 조판으로 긴 문단도 화면 높이에 맞춰 나눈다. 스크롤/게임 원장을 변경하지 않는다.
export class PageReader {
  private key = '';
  private index = 0;
  private complete = false;
  private cleanup = () => {};
  detach() { this.cleanup(); this.cleanup = () => {}; }

  bind(options: {
    key: string; viewport: HTMLElement; content: HTMLElement; surface: HTMLElement; toolbar: HTMLElement;
    paused: boolean; canChoose: () => boolean; gates: HTMLElement[]; choiceButtons?: HTMLButtonElement[];
    finishLabel: string; onComplete: () => void;
  }) {
    this.detach();
    if (options.key !== this.key) { this.key = options.key; this.index = 0; this.complete = false; }
    const { viewport, content, surface, toolbar } = options;
    const previous = toolbar.querySelector<HTMLButtonElement>('#reading-faster')!;
    const next = toolbar.querySelector<HTMLButtonElement>('#reading-pause')!;
    const skip = toolbar.querySelector<HTMLButtonElement>('#reading-skip')!;
    const status = toolbar.querySelector<HTMLElement>('.reading-status')!;
    // 버튼과 선택지 공간을 먼저 확정해야 최초 페이지 수가 다음 프레임에서 바뀌지 않는다.
    previous.textContent = '이전 페이지'; next.textContent = '다음 페이지';
    options.gates.forEach(gate => { gate.hidden = !this.complete; });
    let count = 1; let pitch = 0;
    const update = () => {
      this.index = Math.min(this.index, count - 1);
      content.style.transform = `translateX(${-this.index * pitch}px)`;
      viewport.dataset.pageIndex = String(this.index); viewport.dataset.pageCount = String(count);
      surface.dataset.reading = String(!this.complete);
      status.textContent = `${this.index + 1} / ${count}페이지 · 누르면 다음 페이지`;
      previous.textContent = '이전 페이지'; previous.setAttribute('aria-label', '이전 페이지'); previous.disabled = this.index === 0;
      next.textContent = this.index + 1 < count ? '다음 페이지' : options.finishLabel;
      next.setAttribute('aria-label', next.textContent); next.disabled = options.paused;
      skip.disabled = this.complete || options.paused;
      options.gates.forEach(gate => { gate.hidden = !this.complete; });
      options.choiceButtons?.forEach(b => { b.disabled = !this.complete || !options.canChoose() || b.dataset.enabled === 'false'; });
    };
    const measure = () => {
      const width = viewport.clientWidth;
      if (!width || !viewport.clientHeight) return;
      content.style.columnWidth = `${width}px`; pitch = width + 32;
      count = Math.max(1, Math.ceil((content.scrollWidth + 32 - .5) / pitch));
      update();
    };
    const advance = () => {
      if (options.paused) return;
      if (this.index + 1 < count) { this.index++; update(); }
      else { this.complete = true; update(); options.onComplete(); }
    };
    const backward = () => { if (options.paused || !this.index) return; this.index--; this.complete = false; update(); };
    const skipAll = () => { if (options.paused) return; this.index = count - 1; this.complete = true; update(); options.onComplete(); };
    const click = (event: MouseEvent) => {
      if ((event.target as Element).closest('button, a, input, summary, select, textarea, [role="button"], dialog')) return;
      advance();
    };
    const keyboard = (event: KeyboardEvent) => {
      if ((event.target as Element).closest('button, input, select, textarea, dialog')) return;
      if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); advance(); }
      if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); backward(); }
    };
    viewport.addEventListener('click', click); viewport.addEventListener('keydown', keyboard);
    previous.addEventListener('click', backward); next.addEventListener('click', advance); skip.addEventListener('click', skipAll);
    const resize = new ResizeObserver(measure); resize.observe(viewport);
    const textSize = new MutationObserver(measure); textSize.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    this.cleanup = () => {
      resize.disconnect(); textSize.disconnect(); viewport.removeEventListener('click', click); viewport.removeEventListener('keydown', keyboard);
      previous.removeEventListener('click', backward); next.removeEventListener('click', advance); skip.removeEventListener('click', skipAll);
    };
    measure();
    if (this.complete && !options.paused) options.onComplete();
  }
}
