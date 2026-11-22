import type { Buyer } from './buyer';
import type { ShippingMethod, ZoneId } from './shipping';
import type { LocalizedText, Size } from './types';

/** Order status, in the order the client works through them (see spec). */
export const ORDER_STATUSES = ['baru', 'dikemas', 'dikirim', 'selesai', 'dibatalkan'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type PaymentMethod = 'paypal' | 'card';

export interface OrderItem {
  productId: string;
  /** Copy of the product name at the time of purchase. */
  name: LocalizedText;
  size: Size;
  quantity: number;
  /** Price at the time of purchase, in USD cents. */
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface Order {
  /** e.g. "AT-1001" */
  number: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Language the buyer used, for notification previews. */
  lang: 'en' | 'id';
  buyer: Buyer;
  items: OrderItem[];
  shippingMethod: ShippingMethod;
  shippingZone: ZoneId;
  shippingDays: [number, number];
  shippingCents: number;
  subtotalCents: number;
  totalCents: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  trackingNumber?: string;
}

export type PlaceOrderError = 'empty_cart' | 'invalid_buyer' | 'stock_changed' | 'shipping_unavailable';
export type PlaceOrderResult = { ok: true; order: Order } | { ok: false; reason: PlaceOrderError };

export interface PlaceOrderInput {
  buyer: Buyer;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  lang: 'en' | 'id';
  /** Injected clock, for tests. */
  now?: Date;
}

/**
 * Allowed status changes. Cancelling is only possible before shipping.
 * Shipping requires a tracking number.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  baru: ['dikemas', 'dibatalkan'],
  dikemas: ['dikirim', 'dibatalkan'],
  dikirim: ['selesai'],
  selesai: [],
  dibatalkan: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export type StatusChangeError = 'not_found' | 'invalid_transition' | 'tracking_required';
export type StatusChangeResult = { ok: true; order: Order } | { ok: false; reason: StatusChangeError };

/** First order number is AT-1001. */
export const FIRST_ORDER_SEQ = 1001;

export function formatOrderNumber(seq: number): string {
  return `AT-${seq}`;
}
