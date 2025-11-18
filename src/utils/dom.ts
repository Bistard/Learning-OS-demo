export type InputValue = string | number | boolean;

export const bindClick = (
  root: ParentNode,
  selector: string,
  handler: (event: MouseEvent) => void
): void => {
  const element = root.querySelector<HTMLElement>(selector);
  element?.addEventListener('click', (event) => {
    event.preventDefault();
    handler(event as MouseEvent);
  });
};

export const bindInput = (
  root: ParentNode,
  selector: string,
  handler: (value: InputValue, event: Event) => void
): void => {
  const element = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (!element) return;
  const listener = (event: Event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (target.type === 'checkbox') {
      handler((target as HTMLInputElement).checked, event);
    } else if (target.type === 'range') {
      handler(Number(target.value), event);
    } else {
      handler(target.value, event);
    }
  };
  element.addEventListener('input', listener);
  element.addEventListener('change', listener);
};

export const bindListClick = (
  root: ParentNode,
  selector: string,
  handler: (element: HTMLElement, event: MouseEvent) => void
): void => {
  root.querySelectorAll<HTMLElement>(selector).forEach((element) =>
    element.addEventListener('click', (event) => handler(element, event as MouseEvent))
  );
};
