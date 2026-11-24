// Ambil screenshot untuk README: katalog, halaman produk, dan dashboard admin.
// Pemakaian: npm run screenshots
//   BASE_URL=http://localhost:5173 npm run screenshots   (untuk build lokal)
// Memakai Microsoft Edge yang sudah terpasang (sama seperti tes e2e).
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const BASE = (process.env.BASE_URL ?? 'https://khanigaraa.github.io/ashen-thread-store/').replace(/\/?$/, '/');
const OUT = 'docs';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 80 });

// 1. Katalog
await page.goto(`${BASE}#/`);
await page.waitForLoadState('networkidle');
await shot('katalog');

// 2. Halaman produk dengan ukuran dipilih
await page.goto(`${BASE}#/product/night-ride-tee`);
await page.getByRole('heading', { name: 'Night Ride Tee' }).waitFor();
await page.getByRole('button', { name: 'M', exact: true }).click();
await shot('produk');

// 3. Satu pesanan contoh supaya dashboard admin tidak kosong
await page.getByRole('button', { name: 'Add to cart' }).click();
await page.goto(`${BASE}#/checkout`);
await page.getByLabel('Email', { exact: true }).fill('jane@example.com');
await page.getByLabel('Phone (with country code)').fill('+1 555 123 4567');
await page.getByLabel('Full name').fill('Jane Doe');
await page.getByLabel('Street address').fill('12 Main Street');
await page.getByLabel('City', { exact: true }).fill('Portland');
await page.getByLabel('Postal code').fill('97201');
await page.getByLabel('Country', { exact: true }).selectOption('US');
await page.getByText('$15.00 · 14–28 days').waitFor();
await shot('checkout');
await page.getByRole('button', { name: 'Continue to payment' }).click();
await page.getByRole('button', { name: 'Pay with PayPal' }).click();
await page.waitForURL(/#\/order\//);

await page.goto(`${BASE}#/admin`);
await page.getByLabel('Email', { exact: true }).fill('admin@ashenthread.test');
await page.getByLabel('Password').fill('demo-ashen');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.getByRole('heading', { name: 'Dashboard' }).waitFor();
await shot('admin-dashboard');

// 4. Katalog di layar HP
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await phone.goto(`${BASE}#/`);
await phone.waitForLoadState('networkidle');
await phone.screenshot({ path: `${OUT}/mobile.jpg`, type: 'jpeg', quality: 80 });

await browser.close();
console.log(`Screenshot tersimpan di ${OUT}/ (sumber: ${BASE})`);
