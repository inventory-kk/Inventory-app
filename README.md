# INVENTORY MANAGEMENT & DAILY SO

## Fitur Utama
- Multi-Batch Expire Date dengan sistem FEFO
- Konversi satuan (UOM Besar ↔ UOM Kecil)
- Daily Stock Opname (SO) untuk barista
- Dashboard real-time dengan chart
- Estimasi order otomatis
- Export/Import data backup
- PWA ready (bisa diinstall di HP)

## Cara Menggunakan
1. Buka index.html di browser
2. Tambahkan item melalui menu Master
3. Input barang masuk (IN) dengan expire date
4. Saat barang keluar (OUT), pilih batch expire terdekat (FEFO)
5. Lakukan Daily SO untuk mengecek stok fisik vs sistem
6. Gunakan fitur Estimasi Order untuk rekomendasi pembelian

## Teknologi
- HTML5 + CSS3 + JavaScript
- IndexedDB untuk penyimpanan lokal
- Service Worker untuk PWA
- Canvas untuk chart
