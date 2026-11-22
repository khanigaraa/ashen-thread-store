/** Go to a hash route, re-rendering even when we are already on it. */
export function go(hash: string): void {
  if (location.hash === hash) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = hash;
  }
}
