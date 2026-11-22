/** A rendered page: HTML plus an optional hook to attach event listeners. */
export interface View {
  html: string;
  mount?: (root: HTMLElement) => void;
}
