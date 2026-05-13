# Setup Lokal — IPB Lucky Sport & Art

Panduan lengkap buat yang baru clone repo atau setup ulang dari awal.

---

## Prasyarat

Pastikan ini semua sudah terinstall:

- [Node.js](https://nodejs.org/) v18+
- [Docker](https://www.docker.com/) + Docker Compose
- [Git](https://git-scm.com/)

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd IPB-LSA
```

Install dependencies masing-masing app:

```bash
cd dashboard && npm install && cd ..
cd web && npm install && cd ..
```

---

## 2. Environment Variables

Setiap app punya `.env` sendiri. Minta file `.env` ke PM atau Gilang — jangan di-commit ke repo.

| App | File |
|---|---|
| Backend (Directus) | `backend/.env` |
| Dashboard | `dashboard/.env.local` |
| Web | `web/.env.local` |

---

## 3. Jalankan Backend (Docker)

Backend jalan pakai Docker. Dari folder `backend/`:

```bash
cd backend
docker compose up -d
```

Ini akan menjalankan dua container:
- `backend-database-1` — PostgreSQL di port `7676`
- `backend-directus-1` — Directus CMS di port `7777`

Cek status container:

```bash
docker ps
```

Tunggu sampai kolom `STATUS` container database menunjukkan `(healthy)` sebelum lanjut.

### Matikan backend

```bash
docker compose down
```

Data database tersimpan di `backend/data/database/` jadi tidak hilang saat container dimatikan.

---

## 4. Jalankan Frontend

Buka terminal terpisah untuk masing-masing:

**Public Site** — [http://localhost:3000](http://localhost:3000)
```bash
cd web
npm run dev
```

**Admin Dashboard** — [http://localhost:3001](http://localhost:3001)
```bash
cd dashboard
npm run dev
```

---

## 5. Migrasi Database

Migrasi dijalankan **otomatis** oleh Directus saat pertama kali container naik. File migrasinya ada di `backend/extensions/`.

Kalau kamu sudah punya database lama yang jalan dan ada perubahan trigger/index, cek [`docs/db-patches.md`](db-patches.md) — di sana ada daftar SQL yang perlu dijalankan manual.

### Cara jalankan SQL manual

```bash
docker exec -it backend-database-1 psql -U directus -d directus
```

Paste SQL-nya, tekan Enter, lalu `\q` untuk keluar.

---

## 6. Akses Directus Admin

Buka [http://localhost:7777](http://localhost:7777) di browser.

Kredensial default ada di `backend/.env` (`ADMIN_EMAIL` dan `ADMIN_PASSWORD`).

---

## Troubleshooting

**Container tidak mau naik**
```bash
docker compose down
docker compose up -d --build
```

**Database error saat pertama naik**
Pastikan folder `backend/data/database/` kosong, lalu restart:
```bash
rm -rf backend/data/database/*
docker compose up -d
```

**Port sudah dipakai**
Cek apakah ada container lain yang pakai port `7676` atau `7777`:
```bash
docker ps
```