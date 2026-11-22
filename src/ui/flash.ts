import type { MessageKey } from './i18n';

/** A one-time message shown on the next page that asks for it. */
let pending: MessageKey | undefined;

export function setFlash(key: MessageKey): void {
  pending = key;
}

export function takeFlash(): MessageKey | undefined {
  const key = pending;
  pending = undefined;
  return key;
}
