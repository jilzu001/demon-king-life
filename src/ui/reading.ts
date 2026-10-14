export type ReadingStep = { element: HTMLElement; stage: 'chronicle' | 'scene' };

// 읽기 진행은 화면에서만 유지한다. 저장 원장·판정·난수에는 관여하지 않는다.
export class ReadingSequence {
  private key = '';
  private shown = 0;
  private complete = false;
  private fast = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private cleanup = () => {};

  detach() {
    clearTimeout(this.timer); this.timer = undefined;
    this.cleanup(); this.cleanup = () => {};
  }

  bind(options: {
    key: string; steps: ReadingStep[]; surface: HTMLElement; controls: HTMLElement;
    status: HTMLElement; faster: HTMLButtonElement; skip: HTMLButtonElement;
    gates: HTMLElement[]; paused: boolean; canChoose: () => boolean;
    onReveal: (step: ReadingStep, firstOfStage: boolean) => void;
    onSkip: () => void;
  }) {
    this.detach();
    if (this.key !== options.key) {
      this.key = options.key; this.shown = 0; this.complete = false; this.fast = false;
    }
    const { steps, gates, controls, status, faster, skip, surface } = options;
    const update = () => {
      steps.forEach((step, i) => { step.element.hidden = !this.complete && i >= this.shown; });
      gates.forEach(gate => { gate.hidden = !this.complete; });
      surface.dataset.reading = String(!this.complete);
      controls.hidden = this.complete;
      faster.disabled = this.fast;
      status.textContent = this.fast ? '빠르게 표시하고 있습니다…' : '한 줄씩 읽는 중 · 화면을 누르면 빠르게 표시';
      surface.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(b => {
        b.disabled = !this.complete || !options.canChoose() || b.dataset.enabled === 'false';
      });
    };
    const schedule = () => {
      if (this.complete || options.paused) return;
      const line = steps[this.shown - 1]?.element.textContent ?? '';
      // 한글 약 8자/초. 짧은 줄도 읽을 틈을 두고 긴 문장은 직접 스크롤할 수 있다.
      const delay = this.fast ? 160 : Math.max(1400, Array.from(line).length * 125);
      this.timer = setTimeout(advance, delay);
    };
    const advance = () => {
      if (this.shown >= steps.length) { this.complete = true; update(); return; }
      const step = steps[this.shown]!;
      const firstOfStage = this.shown === 0 || steps[this.shown - 1]!.stage !== step.stage;
      this.shown++; update();
      step.element.classList.add('reading-arrival');
      options.onReveal(step, firstOfStage);
      schedule();
    };
    const accelerate = () => {
      if (this.complete || options.paused || this.fast) return;
      this.fast = true; clearTimeout(this.timer); update(); schedule();
    };
    const skipAll = () => {
      if (this.complete || options.paused) return;
      clearTimeout(this.timer); this.shown = steps.length; this.complete = true; update(); options.onSkip();
    };
    const click = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('button, a, input, summary, select, textarea, [role="button"]')) accelerate();
    };
    surface.addEventListener('click', click); faster.addEventListener('click', accelerate); skip.addEventListener('click', skipAll);
    this.cleanup = () => {
      surface.removeEventListener('click', click); faster.removeEventListener('click', accelerate); skip.removeEventListener('click', skipAll);
    };
    update();
    if (!this.complete && !options.paused) {
      if (this.shown === 0) advance(); else schedule();
    }
  }
}
