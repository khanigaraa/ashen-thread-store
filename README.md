# ashen.thread — Demo Toko Online Merch Musik

Demo toko online untuk brand merch musik yang menjual ke pembeli **dalam dan luar negeri**: katalog bergaya feed Instagram, stok per ukuran, keranjang, checkout dengan ongkir per zona negara, pembayaran (simulasi), dan **dashboard admin** untuk mengelola produk dan pesanan.

🛒 **Coba demo live:** https://khanigaraa.github.io/ashen-thread-store/

> **Proyek portofolio.** *ashen.thread* adalah brand fiktif, dan semua produk, harga, serta kontak di sini hanya contoh. Pembayaran hanya simulasi, jadi tidak ada uang atau data kartu yang diproses.

Ditulis dengan **TypeScript** murni dan **Vite**, tanpa framework UI. Diuji dengan **Vitest** (84 tes unit) dan **Playwright** (tes end-to-end).

## Fitur

**Sisi pembeli**
- Katalog grid bergaya feed Instagram, filter kategori (Tee, Long Sleeve, Jacket), dan label **SOLD OUT**
- Detail produk: beberapa foto, pilihan ukuran S–XXL, ukuran habis otomatis nonaktif, peringatan "tinggal N", dan size chart (cm & inci)
- Keranjang yang tersimpan saat halaman dimuat ulang, dan jumlah tidak bisa melebihi stok
- Checkout dengan validasi form, ongkir otomatis per zona negara (Standard / Express), dan catatan bea masuk
- Pembayaran PayPal / kartu (simulasi) sampai halaman "Order berhasil" dengan nomor pesanan
- Dua bahasa (**English / Indonesia**), harga dalam **USD**
- Halaman About, Shipping, Exchange Policy, dan Contact
- Responsif untuk HP

**Sisi admin**
- Login admin demo (email dan kata sandi ditampilkan di halaman login)
- Kelola pesanan: ubah status, isi nomor resi, dan pratinjau email konfirmasi
- Kelola produk: tambah, edit, sembunyikan, atur stok per ukuran, dan upload foto
- Dashboard ringkasan dan tombol reset data demo

## Mencoba demo

```bash
npm install
npm run dev
```

Buka alamat yang muncul di terminal (atau langsung pakai [demo live](https://khanigaraa.github.io/ashen-thread-store/)). Untuk masuk ke admin, buka `#/admin` lalu pakai login demo:

- Email: `admin@ashenthread.test`
- Kata sandi: `demo-ashen`

## Tes

```bash
npm test            # 84 tes unit (Vitest)
npm run test:e2e    # alur beli sampai admin (Playwright)
npm run build       # cek TypeScript + build produksi
```

## Cara kerja

Demo ini berjalan **sepenuhnya di browser** tanpa server. Data toko disimpan di `localStorage` lewat sebuah *storage adapter* (`src/core/storage.ts`), jadi pesanan dari checkout langsung muncul di dashboard admin pada browser yang sama.

Logika toko (`src/core/`) dipisah dari tampilan (`src/ui/`), sehingga penyimpanan browser bisa diganti dengan backend sungguhan tanpa mengubah logika keranjang, stok, dan pesanan.

```text
src/
├── core/          # Logika toko: produk, stok, keranjang, ongkir, pesanan (+ tes)
│   ├── shop.ts
│   ├── shipping.ts
│   └── storage.ts
└── ui/            # Tampilan, terjemahan EN/ID, dan email
    ├── i18n.ts
    └── views/
e2e/               # Tes end-to-end Playwright
```

## Yang dibutuhkan untuk versi live

Demo ini sengaja belum memakai server. Untuk dipakai berjualan sungguhan, masih dibutuhkan:

- Backend dan database untuk produk, stok, dan pesanan
- Login admin yang aman (bukan kata sandi di kode)
- Integrasi pembayaran sungguhan (misalnya PayPal), dengan kunci API disimpan di environment variable
- Pengiriman email konfirmasi sungguhan

## Mau dibuatkan toko online?

Saya menerima pesanan website: toko online, landing page, company profile, portofolio, sampai aplikasi web.

- LinkedIn: [kantakhanigara](https://www.linkedin.com/in/kantakhanigara)
- Instagram: [@khanigaraa](https://www.instagram.com/khanigaraa)

## Lisensi

[MIT](LICENSE) © 2026 Kanta Khanigara
