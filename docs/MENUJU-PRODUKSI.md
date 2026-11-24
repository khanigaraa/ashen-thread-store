# Menuju versi produksi

Demo ini sengaja tidak memakai server, supaya bisa dicoba siapa saja tanpa akun dan tanpa biaya. Akibatnya, beberapa bagian **belum aman atau belum nyata** untuk dipakai berjualan sungguhan.

| Bagian | Di demo | Yang dibutuhkan untuk produksi |
|---|---|---|
| Data produk, stok, pesanan | `localStorage` di browser masing-masing pengunjung | Backend + database, supaya semua pembeli dan admin melihat data yang sama |
| Login admin | Email dan kata sandi demo tertulis di kode (`src/core/admin.ts`) | Login di server dengan kata sandi ter-hash dan sesi yang aman |
| Pembayaran | Tombol PayPal/kartu hanya simulasi | Integrasi payment gateway sungguhan, kunci API disimpan di environment variable server |
| Email konfirmasi | Hanya pratinjau di admin (`src/ui/emails.ts`) | Pengiriman lewat layanan email |
| Notifikasi WhatsApp | Tertulis "coming soon" di dashboard | Integrasi WhatsApp Business API |

## Kenapa perpindahannya tidak berat

Semua akses data lewat satu adapter, `src/core/storage.ts`. Untuk pindah ke backend, cukup ganti isi adapter itu agar memanggil API. Logika keranjang, stok, ongkir, dan pesanan di `src/core/` tidak perlu diubah, dan 84 unit test-nya tetap bisa dipakai untuk memastikan aturan bisnisnya tidak berubah.
