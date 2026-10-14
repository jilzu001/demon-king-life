export function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (className) e.className = className; return e;
}
export function button(text: string, action: () => void | Promise<void>, disabled = false) {
  const b = element('button', text); b.type = 'button'; b.disabled = disabled;
  b.addEventListener('click', () => { void action(); }); return b;
}
export function icon(kind: 'book' | 'settings' | 'sword' | 'coin'): SVGSVGElement {
  const paths = {
    book: 'M3 4h6c2 0 3 1 3 2v15c0-2-2-3-4-3H3z M21 4h-6c-2 0-3 1-3 2v15c0-2 2-3 4-3h5z',
    settings: 'M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M5.6 18.4l2.1-2.1 M16.3 7.7l2.1-2.1 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    sword: 'M4 20l4-4 M3 15l6 6 M8 16L19 5l1-1v5L9 20',
    coin: 'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0 M12 7v10 M15 9h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9',
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', paths[kind]); svg.append(path); return svg;
}
