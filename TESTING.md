# Panduan Testing (Edisi Santai)

Halo! Kalau kamu baca ini, berarti kamu mau nambahin test atau baru masuk ke project ini. Sistem test kita simpel kok. Kita pake Vitest buat unit atau integration test dan Playwright buat test tampilan atau frontend (E2E).

## Struktur Folder
- (File __tests__/*.test.ts): Isinya logika dibalik layar seperti Server Actions dan validasi.
- (Folder tests/): Isinya test Playwright buat simulasi browser beneran.

## Cara Jalanin Test
```bash
# Jalanin semua test logika (Vitest)
npm test

# Jalanin test tampilan (Playwright)
npx playwright test
```

## Prinsip Keamanan
Kita gak cuma ngetest kalau datanya bener, tapi kita ngetest gimana supaya sistem gak jebol. Beberapa hal wajib yang harus ada di tiap fitur baru:

1. Ownership (IDOR): Pastikan user cuma bisa edit barang milik mereka sendiri. Contohnya PJ Ormawa cuma bisa edit peserta di event mereka.
2. Lockout Prevention: Jangan sampai admin bisa hapus diri sendiri atau hapus admin terakhir di sistem.
3. Mass Assignment: Pakai whitelist field supaya user gak bisa ganti status admin atau status pemenang sesuka hati.
4. XSS Protection: Semua input teks harus dibersihkan sebelum disimpan ke database.

## Pola Mocking (Vitest)
Kita nge-mock data supaya gak perlu koneksi ke database beneran pas lagi development:

```typescript
// Simulasi login jadi SuperAdmin
vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin' } } as any)

// Simulasi data dari database
vi.mocked(adminDirectus.request).mockImplementation(async (req) => {
  if (req.type === 'readItem') return { id: '123', name: 'Contoh' }
  return {}
})
```

Kalau ada yang bingung, tanya aja. Selamat coding!
