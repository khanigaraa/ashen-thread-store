import { formatUSD } from '../../core/money';
import type { CartLine, Shop } from '../../core/shop';
import type { Size } from '../../core/types';
import { esc } from '../html';
import { loc, t } from '../i18n';
import { photo } from '../photo';
import type { View } from '../view';

/** Tell the app the cart changed (header badge, cart page). */
export function notifyCartChange(): void {
  window.dispatchEvent(new CustomEvent('cart:change'));
}

function line(l: CartLine): string {
  const name = loc(l.product.name);
  const atMax = l.quantity >= l.available;
  const over = l.quantity > l.available;
  const key = `data-id="${esc(l.product.id)}" data-size="${l.size}"`;
  return `
    <li class="cart-line">
      <a class="cart-thumb" href="#/product/${esc(l.product.slug)}">${photo(l.product.photos[0], name)}</a>
      <div class="cart-body">
        <a class="cart-name" href="#/product/${esc(l.product.slug)}">${esc(name)}</a>
        <span class="muted small">${t('cart.size', { size: l.size })} · ${formatUSD(l.product.priceCents)}</span>
        <div class="qty" role="group" aria-label="${t('cart.quantity')}">
          <button type="button" data-dec ${key} aria-label="${t('cart.decrease')}">−</button>
          <span class="qty-value" aria-live="polite">${l.quantity}</span>
          <button type="button" data-inc ${key} aria-label="${t('cart.increase')}"
            ${atMax ? `disabled title="${t('cart.maxReached')}"` : ''}>+</button>
        </div>
        ${
          over
            ? `<p class="stock-note">${
                l.available === 0 ? t('cart.soldOutLine') : t('cart.stockChanged', { n: l.available })
              }</p>`
            : ''
        }
        <button type="button" class="link-btn" data-remove ${key}>${t('cart.remove')}</button>
      </div>
      <span class="cart-total">${formatUSD(l.lineTotalCents)}</span>
    </li>`;
}

export function cartView(shop: Shop): View {
  const lines = shop.cartLines();

  if (lines.length === 0) {
    return {
      html: `
        <section class="section narrow">
          <h1 class="page-title">${t('cart.title')}</h1>
          <p class="muted">${t('cart.empty')}</p>
          <a class="btn" href="#/shop">${t('cart.continue')}</a>
        </section>`,
    };
  }

  const blocked = lines.some((l) => l.quantity > l.available);
  const html = `
    <section class="section cart">
      <h1 class="page-title">${t('cart.title')}</h1>
      <ul class="cart-lines">${lines.map(line).join('')}</ul>
      <div class="cart-summary">
        <div class="summary-row"><span>${t('cart.subtotal')}</span><strong>${formatUSD(shop.cartSubtotalCents())}</strong></div>
        <p class="muted small">${t('cart.shippingNote')}</p>
        ${
          blocked
            ? `<button type="button" class="btn btn-block" disabled>${t('cart.checkout')}</button>`
            : `<a class="btn btn-block" href="#/checkout">${t('cart.checkout')}</a>`
        }
        <a class="back" href="#/shop">← ${t('cart.continue')}</a>
      </div>
    </section>`;

  const mount = (root: HTMLElement) => {
    const target = (btn: HTMLElement) => ({ id: btn.dataset.id!, size: btn.dataset.size as Size });
    root.querySelectorAll<HTMLButtonElement>('[data-inc]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const { id, size } = target(btn);
        shop.setCartQuantity(id, size, shop.quantityInCart(id, size) + 1);
        notifyCartChange();
      }),
    );
    root.querySelectorAll<HTMLButtonElement>('[data-dec]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const { id, size } = target(btn);
        shop.setCartQuantity(id, size, shop.quantityInCart(id, size) - 1);
        notifyCartChange();
      }),
    );
    root.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const { id, size } = target(btn);
        shop.removeFromCart(id, size);
        notifyCartChange();
      }),
    );
  };

  return { html, mount };
}

