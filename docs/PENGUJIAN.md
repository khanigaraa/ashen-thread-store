# Pengujian

```bash
npm test            # 84 unit test (Vitest)
npm run test:e2e    # 1 tes end-to-end: alur beli sampai admin (Playwright)
npm run build       # cek TypeScript + build produksi
```

Tes end-to-end dan `npm run screenshots` memakai **Microsoft Edge** yang sudah terpasang (`channel: 'msedge'` di `playwright.config.ts`), jadi tidak perlu mengunduh browser Playwright. Di komputer tanpa Edge, jalankan `npx playwright install chromium` lalu hapus baris `channel` tersebut.

## Unit test (Vitest): 84 tes di 10 file

| File | Jumlah | Yang dicek |
|---|---|---|
| `src/core/checkout.test.ts` | 13 | Zona ongkir (Express tidak tersedia untuk domestik), validasi data pembeli, dan ringkasan checkout |
| `src/core/shop.test.ts` | 11 | Katalog dan filter kategori, status stok (SOLD OUT), ketersediaan ukuran, versi data contoh, format uang |
| `src/core/products.test.ts` | 10 | Tambah dan edit produk: slug unik, nama Inggris dipakai kalau nama Indonesia kosong |
| `src/core/cart.test.ts` | 9 | Keranjang: baris produk dan ukuran yang sama digabung, jumlah tidak pernah melebihi stok |
| `src/core/status.test.ts` | 8 | Status pesanan hanya boleh maju (atau batal sebelum dikirim), tidak bisa lompat atau mundur |
| `src/core/orders.test.ts` | 6 | Membuat pesanan: data disalin, stok per ukuran berkurang, keranjang dikosongkan, nomor berurutan |
| `src/ui/i18n.test.ts` | 6 | Setiap teks Inggris punya terjemahan Indonesia, dan placeholder terisi |
| `src/core/dashboard.test.ts` | 4 | Dashboard: hitungan pesanan baru dan dikemas, total penjualan tanpa yang batal, peringatan stok |
| `src/ui/info.test.ts` | 3 | Halaman Shipping: satu baris per zona yang dibaca dari tarif checkout, ada versi Indonesia |
| `src/ui/emails.test.ts` | 2 | Email pembeli memakai bahasa saat belanja, notifikasi admin memakai bahasa admin |

## Tes end-to-end (Playwright)

`e2e/purchase-to-admin.spec.ts` menjalankan satu alur lengkap di browser sungguhan:

1. Buka produk **Night Ride Tee**, pastikan tombol beli nonaktif sebelum ukuran dipilih.
2. Pilih ukuran M, masukkan ke keranjang, lalu checkout ke **Amerika Serikat** (zona 3).
3. Pastikan ongkir **$15.00** dan total **$43.00**, lalu bayar dengan PayPal (simulasi).
4. Pastikan pesanan **AT-1001** terkonfirmasi dan stok ukuran M berkurang 1.
5. Login admin, lalu pastikan pesanan muncul di dashboard dan daftar pesanan dengan nama, negara, total, dan status **New**.
