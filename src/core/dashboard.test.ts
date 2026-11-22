import { describe, expect, it } from 'vitest';
import type { Buyer } from './buyer';
import { SEED_PRODUCTS } from './seed';
import { createShop } from './shop';
import { memoryStorage } from './storage';
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
  priceCents: 2000,
  weightGrams: 220,
  photos: [],
  stock: { S: 0, M: 2, L: 10, XL: 3, XXL: 1 },
  hidden: false,
};
const hiddenTee: Product = { ...tee, id: 'hidden', slug: 'hidden', hidden: true };

function order(shop: ReturnType<typeof createShop>, size: 'L' | 'XL' = 'L') {
  shop.addToCart('tee', size);
  const r = shop.placeOrder({ buyer, shippingMethod: 'standard', paymentMethod: 'paypal', lang: 'en' });
  if (!r.ok) throw new Error(r.reason);
  return r.order;
}

describe('dashboard summary', () => {
  it('counts new and packed orders and sums sales without cancelled ones', () => {
    const shop = createShop(memoryStorage(), [tee], 1);
    const a = order(shop); // $20 + $15 shipping = $35
    const b = order(shop);
    const c = order(shop);
    shop.updateOrderStatus(b.number, 'dikemas');
    shop.updateOrderStatus(c.number, 'dibatalkan');
    const s = shop.dashboardSummary();
    expect(a.totalCents).toBe(3500);
    expect(s.newOrders).toBe(1);
    expect(s.toShip).toBe(1);
    expect(s.orderCount).toBe(2);
    expect(s.salesCents).toBe(7000);
  });

  it('lists sold-out and low sizes of visible products only', () => {
    const shop = createShop(memoryStorage(), [tee, hiddenTee], 1);
    const s = shop.dashboardSummary();
    expect(s.soldOut.map((a) => `${a.product.id}:${a.size}`)).toEqual(['tee:S']);
    expect(s.lowStock.map((a) => `${a.product.id}:${a.size}:${a.quantity}`)).toEqual(['tee:M:2', 'tee:XXL:1']);
  });

  it('is all zero for a fresh shop with no orders', () => {
    const s = createShop(memoryStorage(), [tee], 1).dashboardSummary();
    expect([s.newOrders, s.toShip, s.orderCount, s.salesCents]).toEqual([0, 0, 0, 0]);
  });
});

describe('reset demo', () => {
  it('restores the sample catalog and clears orders, cart and checkout but keeps admin login', () => {
    const storage = memoryStorage();
    const shop = createShop(storage);
    shop.adminLogin('admin@ashenthread.test', 'demo-ashen');
    shop.addToCart('p01', 'M');
    shop.saveCheckoutDraft({ buyer, method: 'express' });
    shop.placeOrder({ buyer, shippingMethod: 'standard', paymentMethod: 'card', lang: 'en' });
    shop.saveProduct({ ...SEED_PRODUCTS[0], priceCents: 9900 }, 'p01');
    shop.saveProduct({ ...SEED_PRODUCTS[0], name: { en: 'Test Hoodie', id: '' } });
    shop.addToCart('p02', 'L');

    shop.resetDemo();

    expect(shop.listOrders()).toEqual([]);
    expect(shop.cartCount()).toBe(0);
    expect(shop.getCheckoutDraft().buyer.email).toBe('');
    expect(shop.listAllProducts()).toEqual(SEED_PRODUCTS);
    expect(shop.isAdminLoggedIn()).toBe(true);

    // Order numbers start again from AT-1001.
    shop.addToCart('p01', 'M');
    const again = shop.placeOrder({ buyer, shippingMethod: 'standard', paymentMethod: 'card', lang: 'en' });
    expect(again.ok && again.order.number).toBe('AT-1001');
  });
});
