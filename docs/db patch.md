# DB Patches — Manual Fixes

Daftar patch SQL yang perlu dijalankan manual kalau kamu sudah punya database yang berjalan sebelum perubahan ini di-commit.

Kalau kamu **baru setup dari awal**, tidak perlu jalankan apapun di sini — migrasi sudah include semua fix ini.

---

## Cara Jalankan Patch

```bash
docker exec -it backend-database-1 psql -U directus -d directus
```

Paste SQL-nya, Enter, lalu `\q` untuk keluar.

---

## Patches

### [2026-05-11] Fix trigger `sync_match_denorm` — match tidak bisa dimulai

**Gejala:** Error `cannot get array length of a scalar` saat mencoba start match.

**Penyebab:** PostgreSQL tidak menjamin short-circuit evaluation dalam kondisi `WHEN A AND B`. Artinya `jsonb_array_length` tetap dipanggil meskipun `rankings` bukan array (misalnya JSON `null` dari `DEFAULT_LIVE_STATE`), dan itu langsung throw error.

**Fix:** Ganti dengan nested `CASE` supaya `jsonb_array_length` hanya dipanggil setelah terkonfirmasi nilainya memang array.

```sql
CREATE OR REPLACE FUNCTION sync_match_denorm()
RETURNS trigger AS $$
BEGIN
  NEW.home_score := COALESCE((NEW.live_state->>'homeScore')::int, 0);
  NEW.away_score := COALESCE((NEW.live_state->>'awayScore')::int, 0);
  NEW.timer_secs := COALESCE((NEW.live_state->>'timerSecs')::int, 0);
  NEW.winner     := NEW.live_state->>'winner';
  NEW.rankings := CASE
    WHEN jsonb_typeof(NEW.live_state->'rankings') = 'array'
    THEN CASE
      WHEN jsonb_array_length(NEW.live_state->'rankings') > 0
      THEN NEW.live_state->'rankings'
      ELSE NULL
    END
    ELSE NULL
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Setelah dijalankan harusnya langsung muncul `CREATE FUNCTION`. Tidak perlu restart apapun.
tinggal ketik `\n` trs enter.