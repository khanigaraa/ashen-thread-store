import { formatUSD } from '../../core/money';
import { isLowStock, isSizeAvailable, isSoldOut, type Shop } from '../../core/shop';
import { SIZE_CHART, cmToInch } from '../../core/sizechart';
import { SIZES, type Product, type Size } from '../../core/types';
import { esc } from '../html';
import { loc, t } from '../i18n';
import { photo } from '../photo';
import type { View } from '../view';
import { notifyCartChange } from './cart';
import { categoryLabel, notFoundView } from './catalog';

function gallery(p: Product, name: string): string {
  const thumbs =
    p.photos.length > 1
      ? `<div class="thumbs" role="tablist" aria-label="${t('product.photos')}">
          ${p.photos
            .map(
              (src, i) => `
            <button type="button" class="thumb${i === 0 ? ' is-on' : ''}" data-photo="${i}"
              role="tab" aria-selected="${i === 0}" aria-label="${t('product.photo', { n: i + 1 })}">
              ${photo(src, `${i + 1}`)}
            </button>`,
            )
            .join('')}
        </div>`
      : '';
  return `
    <div class="gallery">
      <div class="gallery-main" data-gallery-main>${photo(p.photos[0], name)}</div>
      ${thumbs}
    </div>`;
}

function sizePicker(p: Product): string {
  return `
    <fieldset class="sizes">
      <legend>${t('product.size')}</legend>
      <div class="size-row">
        ${SIZES.map((s) => {
          const available = isSizeAvailable(p, s);
          return `<button type="button" class="size" data-size="${s}" aria-pressed="false"
            ${available ? '' : `disabled aria-disabled="true" title="${t('product.sizeSoldOut')}"`}>${s}</button>`;
        }).join('')}
      </div>
      <p class="stock-note" data-stock-note aria-live="polite"></p>
    </fieldset>`;
}

function sizeChart(p: Product): string {
  const chart = SIZE_CHART[p.category];
  return `
    <details class="sizechart">
      <summary>${t('chart.title')}</summary>
      <table>
        <thead>
          <tr><th>${t('chart.size')}</th><th>${t('chart.chest')}</th><th>${t('chart.length')}</th></tr>
        </thead>
        <tbody>
          ${SIZES.map((s) => {
            const m = chart[s];
            return `<tr><td>${s}</td>
              <td>${m.chestCm} cm / ${cmToInch(m.chestCm)}"</td>
              <td>${m.lengthCm} cm / ${cmToInch(m.lengthCm)}"</td></tr>`;
          }).join('')}
        </tbody>
      </table>
      <p class="muted small">${esc(t('chart.note'))}</p>
    </details>`;
}

export function productView(shop: Shop, slug: string): View {
  const p = shop.getProduct(slug);
  if (!p) return { html: notFoundView() };
  const soldOut = isSoldOut(p);
  const name = loc(p.name);

  const html = `
    <section class="section">
      <a class="back" href="#/shop?cat=${p.category}">← ${categoryLabel(p.category)}</a>
      <div class="product">
        ${gallery(p, name)}
        <div class="product-info">
          <span class="design-tag design-${p.designType}">${t(`design.${p.designType}`)}</span>
          <h1 class="product-name">${esc(name)}</h1>
          <p class="product-price">${formatUSD(p.priceCents)}</p>
          ${soldOut ? `<p class="soldout-note">${t('product.soldOutAll')}</p>` : sizePicker(p)}
          ${
            soldOut
              ? `<button type="button" class="btn btn-block" disabled>${t('product.soldOut')}</button>`
              : `<button type="button" class="btn btn-block" data-add disabled>${t('product.selectSize')}</button>`
          }
          <p class="cart-note muted small" data-cart-note aria-live="polite"></p>
          <p class="product-desc">${esc(loc(p.description))}</p>
          ${sizeChart(p)}
        </div>
      </div>
    </section>`;

  const mount = (root: HTMLElement) => {
    // Gallery: switch main photo from thumbnails.
    const main = root.querySelector<HTMLElement>('[data-gallery-main]');
    root.querySelectorAll<HTMLButtonElement>('.thumb').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.photo);
        if (main) main.innerHTML = photo(p.photos[i], name);
        root.querySelectorAll('.thumb').forEach((el) => {
          el.classList.toggle('is-on', el === btn);
          el.setAttribute('aria-selected', String(el === btn));
        });
      });
    });

    if (soldOut) return;

    // Size picker: enable "Add to cart" once a size is chosen.
    const addBtn = root.querySelector<HTMLButtonElement>('[data-add]')!;
    const stockNote = root.querySelector<HTMLElement>('[data-stock-note]')!;
    const cartNote = root.querySelector<HTMLElement>('[data-cart-note]')!;
    let selected: Size | undefined;

    root.querySelectorAll<HTMLButtonElement>('.size:not([disabled])').forEach((btn) => {
      btn.addEventListener('click', () => {
        const size = btn.dataset.size as Size;
        selected = size;
        root.querySelectorAll('.size').forEach((b) => {
          b.classList.toggle('is-on', b === btn);
          b.setAttribute('aria-pressed', String(b === btn));
        });
        stockNote.textContent = isLowStock(p, size) ? t('product.onlyLeft', { n: p.stock[size], size }) : '';
        addBtn.textContent = t('product.addToCart');
        const allInCart = shop.quantityInCart(p.id, size) >= p.stock[size];
        addBtn.disabled = allInCart;
        cartNote.textContent = allInCart ? t('product.stockLimit', { size }) : '';
      });
    });

    addBtn.addEventListener('click', () => {
      if (!selected) return;
      const result = shop.addToCart(p.id, selected);
      if (result.ok) {
        cartNote.innerHTML = `${t('product.added')} <a href="#/cart">${t('product.viewCart')}</a>`;
        addBtn.disabled = shop.quantityInCart(p.id, selected) >= p.stock[selected];
        notifyCartChange();
      } else {
        cartNote.textContent = t('product.stockLimit', { size: selected });
      }
    });
  };

  return { html, mount };
}
