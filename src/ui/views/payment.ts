import { isBuyerValid, type Buyer } from '../../core/buyer';
import { formatUSD } from '../../core/money';
import type { Order, PaymentMethod } from '../../core/orders';
import type { Shop } from '../../core/shop';
import { setFlash } from '../flash';
import { esc } from '../html';
import { getLang, loc, t } from '../i18n';
import type { View } from '../view';
import { notifyCartChange } from './cart';
import { notFoundView } from './catalog';

/** Simulated payment delay. */
const PAYMENT_DELAY_MS = 1200;

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames([getLang()], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function address(b: Buyer): string {
  const cityLine = [b.city, b.region, b.postalCode].filter(Boolean).join(', ');
  return [b.name, b.address, cityLine, countryName(b.country)].map(esc).join('<br />');
}

function totalsRows(subtotal: number, shipping: number, total: number): string {
  return `
    <div class="summary-row"><span>${t('cart.subtotal')}</span><span>${formatUSD(subtotal)}</span></div>
    <div class="summary-row"><span>${t('checkout.shipping')}</span><span>${formatUSD(shipping)}</span></div>
    <div class="summary-row total"><span>${t('checkout.total')}</span><strong>${formatUSD(total)}</strong></div>`;
}

export function paymentView(shop: Shop): View {
  const { buyer, method } = shop.getCheckoutDraft();
  const summary = shop.checkoutSummary(buyer.country, method);

  if (summary.itemCount === 0) {
    return {
      html: `
        <section class="section narrow">
          <h1 class="page-title">${t('payment.title')}</h1>
          <p class="muted">${t('cart.empty')}</p>
          <a class="btn" href="#/shop">${t('cart.continue')}</a>
        </section>`,
    };
  }
  if (!isBuyerValid(buyer) || !summary.shipping.ok || summary.totalCents === undefined) {
    return {
      html: `
        <section class="section narrow">
          <h1 class="page-title">${t('payment.title')}</h1>
          <p class="stock-note">${t('payment.failedDetails')}</p>
          <a class="btn" href="#/checkout">${t('payment.back')}</a>
        </section>`,
    };
  }

  const s = summary.shipping;
  const html = `
    <section class="section narrow payment">
      <h1 class="page-title">${t('payment.title')}</h1>
      <div class="review">
        <div class="review-row">
          <div>
            <span class="review-label">${t('payment.contact')}</span>
            <span>${esc(buyer.email)} · ${esc(buyer.phone)}</span>
          </div>
          <a class="small" href="#/checkout">${t('payment.edit')}</a>
        </div>
        <div class="review-row">
          <div>
            <span class="review-label">${t('payment.shipTo')}</span>
            <span>${address(buyer)}</span>
          </div>
          <a class="small" href="#/checkout">${t('payment.edit')}</a>
        </div>
        <div class="review-row">
          <div>
            <span class="review-label">${t('checkout.method')}</span>
            <span>${t(`method.${method}`)} · ${t('checkout.days', { min: s.days[0], max: s.days[1] })}</span>
          </div>
          <a class="small" href="#/checkout">${t('payment.edit')}</a>
        </div>
      </div>

      <div class="pay-totals">${totalsRows(summary.subtotalCents, s.cents, summary.totalCents)}</div>

      <h2 class="block-title">${t('payment.choose')}</h2>
      <div class="pay-buttons">
        <button type="button" class="pay-btn pay-paypal" data-pay="paypal">${t('payment.paypal')}</button>
        <button type="button" class="pay-btn pay-card" data-pay="card">${t('payment.card')}</button>
      </div>
      <p class="pay-status" data-pay-status aria-live="polite"></p>
      <p class="demo-note small">${t('payment.demoNote')}</p>
      <a class="back" href="#/checkout">← ${t('payment.back')}</a>
    </section>`;

  const mount = (root: HTMLElement) => {
    const buttons = root.querySelectorAll<HTMLButtonElement>('[data-pay]');
    const status = root.querySelector<HTMLElement>('[data-pay-status]')!;

    buttons.forEach((btn) =>
      btn.addEventListener('click', () => {
        const paymentMethod = btn.dataset.pay as PaymentMethod;
        buttons.forEach((b) => (b.disabled = true));
        status.innerHTML = `<span class="spinner" aria-hidden="true"></span>${t('payment.processing')}`;

        window.setTimeout(() => {
          const result = shop.placeOrder({ buyer, shippingMethod: method, paymentMethod, lang: getLang() });
          notifyCartChange();
          if (result.ok) {
            location.hash = `#/order/${encodeURIComponent(result.order.number)}`;
          } else if (result.reason === 'stock_changed') {
            setFlash('payment.failedStock');
            location.hash = '#/cart';
          } else if (result.reason === 'empty_cart') {
            location.hash = '#/cart';
          } else {
            setFlash('payment.failedDetails');
            location.hash = '#/checkout';
          }
        }, PAYMENT_DELAY_MS);
      }),
    );
  };

  return { html, mount };
}

export function orderSuccessView(shop: Shop, number: string): View {
  const order: Order | undefined = shop.getOrder(number);
  if (!order) return { html: notFoundView() };

  const items = order.items
    .map(
      (i) => `
      <li>
        <span>${esc(loc(i.name))}<br /><span class="muted small">${t('checkout.item', { size: i.size, qty: i.quantity })}</span></span>
        <span>${formatUSD(i.lineTotalCents)}</span>
      </li>`,
    )
    .join('');

  return {
    html: `
      <section class="section narrow order-done">
        <p class="logo-big order-mark" aria-hidden="true">✠</p>
        <h1 class="page-title">${t('order.thanks')}</h1>
        <p class="order-confirmed">${t('order.confirmed', { number: `<strong>${esc(order.number)}</strong>` })}</p>
        <p class="muted">${t('order.emailNote', { email: esc(order.buyer.email) })}</p>

        <div class="checkout-summary">
          <ul class="summary-lines">${items}</ul>
          ${totalsRows(order.subtotalCents, order.shippingCents, order.totalCents)}
        </div>

        <div class="review">
          <div class="review-row"><div>
            <span class="review-label">${t('payment.shipTo')}</span>
            <span>${address(order.buyer)}</span>
          </div></div>
          <div class="review-row"><div>
            <span class="review-label">${t('checkout.method')}</span>
            <span>${t(`method.${order.shippingMethod}`)}<br />
              <span class="muted small">${t('order.eta', { min: order.shippingDays[0], max: order.shippingDays[1] })}</span></span>
          </div></div>
          <div class="review-row"><div>
            <span class="review-label">${t('order.paidWith')}</span>
            <span>${t(order.paymentMethod === 'paypal' ? 'order.payPaypal' : 'order.payCard')}</span>
          </div></div>
        </div>

        <a class="btn" href="#/shop">${t('cart.continue')}</a>
      </section>`,
  };
}
