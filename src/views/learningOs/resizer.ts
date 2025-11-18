/**
 * Handles pointer events for resizing the side navigation rail.
 */
export interface ResizerOptions {
  getWidth: () => number;
  applyWidth: (nextWidth: number) => void;
  min: number;
  max: number;
}

export const bindNavResizer = (shell: HTMLElement, options: ResizerOptions): void => {
  const resizer = shell.querySelector<HTMLElement>('[data-resizer]');
  if (!resizer) return;
  let startX = 0;
  let startWidth = options.getWidth();
  let activePointerId: number | null = null;

  const clampWidth = (value: number): number =>
    Math.min(options.max, Math.max(options.min, value));

  const handlePointerMove = (event: PointerEvent): void => {
    if (activePointerId === null) return;
    event.preventDefault();
    const delta = event.clientX - startX;
    const nextWidth = clampWidth(startWidth + delta);
    options.applyWidth(nextWidth);
  };

  const stopResizing = (): void => {
    if (activePointerId === null) return;
    if (resizer.hasPointerCapture(activePointerId)) {
      resizer.releasePointerCapture(activePointerId);
    }
    activePointerId = null;
    document.body.classList.remove('is-resizing-nav');
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
  };

  const handlePointerUp = (event: PointerEvent): void => {
    if (activePointerId === null || event.pointerId !== activePointerId) return;
    stopResizing();
  };

  resizer.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    startX = event.clientX;
    startWidth = options.getWidth();
    activePointerId = event.pointerId;
    resizer.setPointerCapture(activePointerId);
    document.body.classList.add('is-resizing-nav');
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  });
};
