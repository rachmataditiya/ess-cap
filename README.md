# Odoo Employee Self Service App

Aplikasi mobile-first Employee Self Service yang terintegrasi dengan Odoo ERP. Dirancang untuk memberikan pengalaman manajemen tempat kerja yang intuitif dan efisien.

## Teknologi

- Frontend: React dengan TypeScript
- Styling: Tailwind CSS dengan komponen neumorphic
- Backend: Express.js sebagai proxy untuk Odoo API
- Integrasi: JSON-RPC API Odoo

## Fitur Utama

- Autentikasi langsung dengan Odoo
- Dashboard dengan ringkasan informasi karyawan
- Manajemen cuti (pengajuan dan pelacakan)
- Pencatatan kehadiran (clock in/out)
- Akses slip gaji
- Pengaturan profil

## Menjalankan Aplikasi Secara Lokal

### Prasyarat

- Node.js v18+ dan npm
- Akses ke instance Odoo

### Instalasi

1. Clone repository
```bash
git clone https://github.com/yourusername/odoo-employee-self-service.git
cd odoo-employee-self-service
```

2. Install dependencies
```bash
npm install
```

3. Buat file `.env` di root directory dengan konfigurasi berikut:
```
# Opsional: port server (default: 5000)
PORT=5000
# Opsional: host binding (default: localhost)
HOST=localhost

# Konfigurasi Odoo (opsional, jika berbeda dari default)
ODOO_URL=https://arkana.co.id
ODOO_DB=odoo16_prod_arkana
```

Kedua variabel Odoo di atas digunakan untuk endpoint proxy di server/routes.ts.

### Menjalankan Aplikasi

```bash
npm run dev
```

Aplikasi akan berjalan di http://localhost:5000

### Troubleshooting untuk MacOS

Jika Anda mendapatkan error `ENOTSUP: operation not supported on socket 0.0.0.0:5000` di MacOS:

1. Pastikan Anda menggunakan versi terbaru dari kode dengan pengaturan server yang diperbarui
2. Gunakan konfigurasi host 'localhost' (ini diatur secara default di versi terbaru)

## Koneksi ke Odoo

Aplikasi menggunakan Express server sebagai proxy untuk menghindari masalah CORS saat berkomunikasi dengan Odoo API.

### Konfigurasi

Konfigurasi API Odoo berada di `client/src/lib/odooApi.ts`. Secara default, aplikasi terhubung ke:

- URL: arkana.co.id
- Database: odoo16_prod_arkana

Untuk mengubah ini, modifikasi constructor OdooClient:

```typescript
constructor(defaultDb: string = 'your_odoo_database') {
  this.apiUrl = '/api/odoo'; // Ini menggunakan Express proxy
  this.defaultDb = defaultDb;
}
```

### Autentikasi

Aplikasi menyimpan kredensial Odoo (termasuk password) dalam session untuk melakukan autentikasi di setiap panggilan API. Ini adalah pendekatan yang direkomendasikan untuk Single Page Application yang berkomunikasi dengan Odoo.