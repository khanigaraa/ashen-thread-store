import { describe, expect, it } from 'vitest';
import type { Order } from '../core/orders';
import { SHOP_EMAIL, adminOrderEmail, buyerOrderEmail } from './emails';

const order: Order = {
  number: 'AT-1001',
  createdAt: '2026-11-19T10:00:00.000Z',
  lang: 'id',
  buyer: {
    name: 'Budi Santoso',
    email: 'budi@example.com',
    phone: '0812-3456-7890',
    address: 'Jl. Braga 10',
    city: 'Bandung',
    region: 'Jawa Barat',
    postalCode: '40111',
    country: 'ID',
  },
  items: [
    { productId: 'p02', name: { en: 'Ashfall Tee', id: 'Kaos Ashfall' }, size: 'L', quantity: 2, unitPriceCents: 2800, lineTotalCents: 5600 },
  ],
  shippingMethod: 'standard',
  shippingZone: 'domestic',
  shippingDays: [2, 5],
  shippingCents: 300,
  subtotalCents: 5600,
  totalCents: 5900,
  paymentMethod: 'paypal',
  status: 'baru',
};

describe('email previews', () => {
  it('buyer confirmation uses the language the buyer shopped in', () => {
    const mail = buyerOrderEmail(order);
    expect(mail.to).toBe('budi@example.com');
    expect(mail.subject).toBe('Pesanan ashen.thread kamu AT-1001');
    expect(mail.lines[0]).toBe('Halo Budi,');
    expect(mail.lines.join('\n')).toContain('Kaos Ashfall · L × 2 — $56.00');
    expect(mail.lines.join('\n')).toContain('Total: $59.00');
  });

  it('admin notification goes to the shop in the admin language', () => {
    const mail = adminOrderEmail(order, 'en');
    expect(mail.to).toBe(SHOP_EMAIL);
    expect(mail.subject).toBe('New order AT-1001 · $59.00');
    const body = mail.lines.join('\n');
    expect(body).toContain('Ashfall Tee · L × 2');
    expect(body).toContain('Budi Santoso · budi@example.com · 0812-3456-7890');
    expect(body).toContain('Bandung, Jawa Barat, 40111');
  });
});
