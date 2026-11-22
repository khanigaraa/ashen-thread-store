import { describe, expect, it } from 'vitest';
import { DEMO_ADMIN } from './admin';
import type { Buyer } from './buyer';
import { ORDER_STATUSES, canTransition } from './orders';
import { createShop } from './shop';
import { memoryStorage, type StorageAdapter } from './storage';
import type { Product } from './types';

const buyer: Buyer = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1 555 123 4567',
  address: '12 Main Street',
  city: 'Portland',
  region: '',
  postalCode: '97201',
  country: 'US',
};

const tee: Product = {
  id: 'tee',
  slug: 'tee',
  name: { en: 'Tee', id: 'Kaos' },
  description: { en: '', id: '' },
  category: 'tee',
  designType: 'original',
  priceCents: 2800,
  weightGrams: 220,
  photos: [],
  stock: { S: 0, M: 2, L: 5, XL: 1, XXL: 0 },
  hidden: false,
};

function withOrder(storage: StorageAdapter = memoryStorage()) {
  const shop = createShop(storage, [tee], 1);
  shop.addToCart('tee', 'L', 2);
  shop.addToCart('tee', 'M', 1);
  const result = shop.placeOrder({ buyer, shippingMethod: 'standard', paymentMethod: 'paypal', lang: 'en' });
  if (!result.ok) throw new Error('order failed');
  return { shop, number: result.order.number, storage };
}

describe('order status transitions', () => {
  it('allows only the forward path and cancelling before shipping', () => {
    const allowed: [string, string][] = [];
    for (const from of ORDER_STATUSES)
      for (const to of ORDER_STATUSES) if (canTransition(from, to)) allowed.push([from, to]);
    expect(allowed).toEqual([
      ['baru', 'dikemas'],
      ['baru', 'dibatalkan'],
      ['dikemas', 'dikirim'],
      ['dikemas', 'dibatalkan'],
      ['dikirim', 'selesai'],
    ]);
  });

  it('walks an order from baru to selesai', () => {
    const { shop, number } = withOrder();
    expect(shop.updateOrderStatus(number, 'dikemas').ok).toBe(true);
    const shipped = shop.updateOrderStatus(number, 'dikirim', { trackingNumber: ' RR123456789ID ' });
    expect(shipped.ok && shipped.order.trackingNumber).toBe('RR123456789ID');
    expect(shop.updateOrderStatus(number, 'selesai').ok).toBe(true);
    expect(shop.getOrder(number)?.status).toBe('selesai');
    expect(shop.getOrder(number)?.trackingNumber).toBe('RR123456789ID');
  });

  it('rejects skipping steps and going backwards', () => {
    const { shop, number } = withOrder();
    expect(shop.updateOrderStatus(number, 'dikirim', { trackingNumber: 'X1' })).toEqual({
      ok: false,
      reason: 'invalid_transition',
    });
    expect(shop.updateOrderStatus(number, 'selesai')).toEqual({ ok: false, reason: 'invalid_transition' });
    shop.updateOrderStatus(number, 'dikemas');
    expect(shop.updateOrderStatus(number, 'baru')).toEqual({ ok: false, reason: 'invalid_transition' });
    expect(shop.getOrder(number)?.status).toBe('dikemas');
  });

  it('requires a tracking number to ship', () => {
    const { shop, number } = withOrder();
    shop.updateOrderStatus(number, 'dikemas');
    expect(shop.updateOrderStatus(number, 'dikirim')).toEqual({ ok: false, reason: 'tracking_required' });
    expect(shop.updateOrderStatus(number, 'dikirim', { trackingNumber: '   ' })).toEqual({
      ok: false,
      reason: 'tracking_required',
    });
    expect(shop.getOrder(number)?.status).toBe('dikemas');
  });

  it('cannot cancel after shipping', () => {
    const { shop, number } = withOrder();
    shop.updateOrderStatus(number, 'dikemas');
    shop.updateOrderStatus(number, 'dikirim', { trackingNumber: 'X1' });
    expect(shop.updateOrderStatus(number, 'dibatalkan')).toEqual({ ok: false, reason: 'invalid_transition' });
  });

  it('cancelling puts every size back in stock', () => {
    const { shop, number, storage } = withOrder();
    expect(createShop(storage, [tee], 1).getProduct('tee')!.stock).toMatchObject({ M: 1, L: 3 });
    expect(shop.updateOrderStatus(number, 'dibatalkan').ok).toBe(true);
    expect(createShop(storage, [tee], 1).getProduct('tee')!.stock).toMatchObject({ M: 2, L: 5 });
  });

  it('reports unknown orders', () => {
    const shop = createShop(memoryStorage(), [tee], 1);
    expect(shop.updateOrderStatus('AT-9999', 'dikemas')).toEqual({ ok: false, reason: 'not_found' });
  });
});

describe('demo admin login', () => {
  it('logs in only with the demo credentials and remembers the session', () => {
    const storage = memoryStorage();
    const shop = createShop(storage, [tee], 1);
    expect(shop.isAdminLoggedIn()).toBe(false);
    expect(shop.adminLogin(DEMO_ADMIN.email, 'wrong')).toBe(false);
    expect(shop.isAdminLoggedIn()).toBe(false);
    expect(shop.adminLogin(` ${DEMO_ADMIN.email.toUpperCase()} `, DEMO_ADMIN.password)).toBe(true);
    expect(createShop(storage, [tee], 1).isAdminLoggedIn()).toBe(true);
    shop.adminLogout();
    expect(shop.isAdminLoggedIn()).toBe(false);
  });
});
