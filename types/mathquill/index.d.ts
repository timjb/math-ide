interface MathField {
  latex(): string
  latex(code: string): void
  focus(): void
  reflow(): void
  moveToLeftEnd(): void
  moveToRightEnd(): void
}

declare namespace MathQuill {

  export function MathField(element: HTMLElement, config?: Object): MathField

  export type SaneKeyboardHandlers = {
    container?: HTMLElement,
    keystroke: (key: string, evt: KeyboardEvent) => void,
    typedText: (text: string) => void,
    cut: () => void,
    copy: () => void
    paste: (text: string) => void
  }
  export function saneKeyboardEvents(el: HTMLElement, handlers: SaneKeyboardHandlers): void
}