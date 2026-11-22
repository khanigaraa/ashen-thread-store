import { expect, test } from '@playwright/test';

// Demo credentials shown on the admin login page (see src/core/admin.ts).
const ADMIN_EMAIL = 'admin@ashenthread.test';
const ADMIN_PASSWORD = 'demo-ashen';

test('a buyer orders a tee to the US and the order shows up in admin with stock reduced', async ({ page }) => {
  const stockOf = (id: string, size: string) =>
    page.evaluate(
      ([pid, s]) => {
        const products = JSON.parse(localStorage.getItem('th:products') ?? '[]');
        return products.find((p: { id: string }) => p.id === pid)?.stock[s];
      },
      [id, size],
    );

  // Product page: pick a size and add to cart.
  await page.goto('/#/product/night-ride-tee');
  await expect(page.getByRole('heading', { name: 'Night Ride Tee' })).toBeVisible();
  const stockBefore = await stockOf('p01', 'M');
  const addButton = page.getByRole('button', { name: 'Select a size' });
  await expect(addButton).toBeDisabled();
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByText('Added to cart.')).toBeVisible();

  // Cart → checkout.
  await page.getByRole('link', { name: 'View cart' }).click();
  await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();
  await page.getByRole('link', { name: 'Checkout' }).click();

  // Checkout to a zone 3 country (United States).
  await page.getByLabel('Email', { exact: true }).fill('jane@example.com');
  await page.getByLabel('Phone (with country code)').fill('+1 555 123 4567');
  await page.getByLabel('Full name').fill('Jane Doe');
  await page.getByLabel('Street address').fill('12 Main Street');
  await page.getByLabel('City', { exact: true }).fill('Portland');
  await page.getByLabel('Postal code').fill('97201');
  await page.getByLabel('Country', { exact: true }).selectOption('US');
  await expect(page.getByText('$15.00 · 14–28 days')).toBeVisible();
  await expect(page.locator('[data-total]')).toHaveText('$43.00'); // $28 + $15 standard
  await page.getByRole('button', { name: 'Continue to payment' }).click();

  // Simulated payment.
  await page.getByRole('button', { name: 'Pay with PayPal' }).click();
  await expect(page).toHaveURL(/#\/order\/AT-1001$/);
  await expect(page.getByText('Your order AT-1001 is confirmed.')).toBeVisible();
  expect(await stockOf('p01', 'M')).toBe(stockBefore - 1);

  // Admin: log in and find the order.
  await page.goto('/#/admin');
  await page.getByLabel('Email', { exact: true }).fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Dashboard counts the new order and the sale.
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.locator('.stat').first()).toContainText('1');
  await expect(page.locator('.stat').nth(2)).toContainText('$43.00');

  await page.getByRole('link', { name: 'Orders', exact: true }).click();
  const row = page.getByRole('row', { name: /AT-1001/ });
  await expect(row).toContainText('Jane Doe');
  await expect(row).toContainText('United States');
  await expect(row).toContainText('$43.00');
  await expect(row).toContainText('New');

  // Order detail shows the item and its size.
  await row.getByRole('link', { name: 'AT-1001' }).click();
  await expect(page.getByRole('cell', { name: 'Night Ride Tee' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'M', exact: true })).toBeVisible();
});
