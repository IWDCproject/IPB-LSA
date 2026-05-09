# IPB Lucky Sport & Art - Platform

Platform manajemen event dan live scoring untuk program IPB Lucky Sport & Art, kolaborasi antara IWDC dan Ditmawa IPB University.

---

## Stack

| Layer | Tech |
|---|---|
| Public Site | Next.js 14, Tailwind CSS, GSAP |
| Admin Dashboard | Next.js 14, Tailwind CSS, shadcn/ui |
| Backend / API | Directus CMS |
| Realtime | Socket.io |
| Database | PostgreSQL (via Directus) |
| Auth | Directus auth via Google |

---

## Struktur Repo

```
IPB-LSA/
├-- web/          # Public site (Next.js)
├-- dashboard/    # Admin dashboard (Next.js)
└-- backend/      # API & CMS (Directus)
```

---

## Dokumentasi

| Doc | Path |
|---|---|
| Homepage system (layout, scroll, blur pipeline, semua section) | [`web/app/HomepageDocs.md`](web/app/HomepageDocs.md) |

---

## Menjalankan Secara Lokal

Tiap app berdiri sendiri. Buka terminal terpisah untuk masing-masing.

**Backend (Directus)**
```bash
cd backend
npm run develop
# runs on http://localhost:8055
```

**Public Site**
```bash
cd web
npm run dev
# runs on http://localhost:3000
```

**Dashboard**
```bash
cd dashboard
npm run dev
# runs on http://localhost:3001
```

### Environment Variables

Setiap app punya `.env` sendiri. Copy dari `.env.example` jika tersedia, atau minta ke PM.

```bash
cp backend/.env.example backend/.env
```

---

## Konvensi Kode

**Routing (Next.js App Router)**
- `app/[route]/page.jsx` - entry point tiap halaman, dibuat setipis mungkin
- `app/[route]/_components/` - komponen spesifik halaman tersebut
- `components/` - komponen yang dipakai di lebih dari satu halaman
- `lib/` - helper functions, API calls, socket client

**Naming**
- Komponen: PascalCase (`EventCard.jsx`)
- Utilities / helpers: camelCase (`formatDate.js`)
- Folder: kebab-case (`_components/`, `live-score/`)

---

## Branching

```
main          # production-ready code only
dev           # active development, PR target
feature/xxx   # fitur baru
fix/xxx       # bug fix
```

Jangan langsung push ke `main`. Buat PR ke `dev`, minta review dulu. (kalo udh deploy)

---

## Tim

Dikerjakan oleh tim IWDC (IPB Web Development Community) berkolaborasi dengan Ditmawa IPB University.
- Adillah Ridwan
- Gilang Muhamad
- Arya Faiz