import { esc } from './html';

/**
 * A square product photo. Until a real file is placed in public/foto/,
 * the image fails to load and the dark placeholder underneath shows instead.
 */
export function photo(src: string | undefined, label: string): string {
  const img = src
    ? `<img src="${esc(src)}" alt="${esc(label)}" loading="lazy" onerror="this.remove()" />`
    : '';
  return `<div class="photo"><div class="photo-ph" aria-hidden="true"><span>${esc(label)}</span></div>${img}</div>`;
}
