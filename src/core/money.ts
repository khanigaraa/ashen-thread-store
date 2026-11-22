const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Format integer USD cents for display, e.g. 2800 -> "$28.00". */
export function formatUSD(cents: number): string {
  return usd.format(cents / 100);
}
