import { formatUSD } from '../core/money';
import type { Order } from '../core/orders';
import { loc, t, type Lang } from './i18n';

/** Example address the client would receive order notifications at (demo value). */
export const SHOP_EMAIL = 'orders@ashenthread.test';

export interface EmailPreview {
  to: string;
  subject: string;
  /** Plain-text body, one line per entry. */
  lines: string[];
}

function countryName(code: string, lang: Lang): string {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function orderBlock(order: Order, lang: Lang): string[] {
  const b = order.buyer;
  return [
    `${t('email.items', {}, lang)}:`,
    ...order.items.map(
      (i) => `  • ${loc(i.name, lang)} · ${i.size} × ${i.quantity} — ${formatUSD(i.lineTotalCents)}`,
    ),
    '',
    `${t('cart.subtotal', {}, lang)}: ${formatUSD(order.subtotalCents)}`,
    `${t('checkout.shipping', {}, lang)} (${t(`method.${order.shippingMethod}`, {}, lang)}): ${formatUSD(order.shippingCents)}`,
    `${t('checkout.total', {}, lang)}: ${formatUSD(order.totalCents)}`,
    '',
    `${t('payment.shipTo', {}, lang)}:`,
    `  ${b.name}`,
    `  ${b.address}`,
    `  ${[b.city, b.region, b.postalCode].filter(Boolean).join(', ')}`,
    `  ${countryName(b.country, lang)}`,
  ];
}

/** Notification the shop owner would get for a new order, in the admin's language. */
export function adminOrderEmail(order: Order, lang: Lang): EmailPreview {
  return {
    to: SHOP_EMAIL,
    subject: t('email.adminSubject', { number: order.number, total: formatUSD(order.totalCents) }, lang),
    lines: [
      t('email.adminIntro', {}, lang),
      '',
      `${order.number} · ${order.buyer.name} · ${order.buyer.email} · ${order.buyer.phone}`,
      `${t('admin.payment', {}, lang)}: ${t(order.paymentMethod === 'paypal' ? 'order.payPaypal' : 'order.payCard', {}, lang)}`,
      '',
      ...orderBlock(order, lang),
      '',
      t('email.adminAction', {}, lang),
    ],
  };
}

/** Confirmation the buyer would get, in the language they shopped in. */
export function buyerOrderEmail(order: Order): EmailPreview {
  const lang = order.lang;
  return {
    to: order.buyer.email,
    subject: t('email.buyerSubject', { number: order.number }, lang),
    lines: [
      t('email.buyerGreeting', { name: order.buyer.name.split(' ')[0] }, lang),
      '',
      t('email.buyerIntro', {}, lang),
      '',
      ...orderBlock(order, lang),
      '',
      t('order.eta', { min: order.shippingDays[0], max: order.shippingDays[1] }, lang),
      t('checkout.duties', {}, lang),
      '',
      ...t('email.signoff', {}, lang).split('\n'),
    ],
  };
}
