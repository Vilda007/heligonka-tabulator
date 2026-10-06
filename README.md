# Heligonka Tabulator

Webová aplikace pro tvorbu tabulatur pro heligonku (2řadá, C/F ladění) ve formátu klasických zpěvníkových tabulek (řádky II. / I. s čísly tlačítek, řádek B s basy, skluzovky, slohy pod notami). Inspirace: zpěvníkové tabulky typu „Na Pankráci" (DVD26).

## Prostředí — PRODUKCE vs DEMO

| Instalace | URL | K čemu |
|---|---|---|
| **PRODUKCE** | https://klepeto.kuzelovi.cz/heligonka/ | Plná aplikace: knihovna, účty, role, hodnocení (PHP backend) |
| Demo (GitHub Pages) | https://vilda007.github.io/heligonka-tabulator/ | Jen generátor tabulatur offline-style; knihovna/login na demo nefunguje funkčně (jen ukazuje UI) |

**Produkční instancí je klepeto.kuzelovi.cz** — GitHub Pages zůstává jako ukázka vzhledu a formátu.

## Deployment (důležité pro údržbu)

- **Zdroj kódu (source of truth): tento GitHub repo.** Každá změna = commit sem.
- **Deploy frontendu na produkci**: FTP upload `index.html`, `app.js`, `style.css`, `library.js` do `/klepeto/heligonka/` na hostingu don.cz (přihlašovací údaje: `~/.openclaw/credentials/kuzelovi/kuzelovi.env`, klíče FTP_*).
- **Deploy backendu**: totéž pro `api.php`, `api-actions.php`, `db.php`. `db.php` si shesla DB čte ze stejného credentials souboru (na hostingu je cesta jinde — viz níže).
- **Pozor na hosting**: PHP 4.3.8 (!) + MySQL starý. NIKDY nepoužívat: `json_encode`/`json_decode` (JSOn kód: ručne přes `jt_json`/`jt_json_decode` v `db.php`), `password_hash` bez fallbacku (viz `password_hash_compat`), `CREATE TABLE ... ENGINE=` (pouze `TYPE=MyISAM`), `mb_*` funkce. Lintovat před deployem: `php8.4 -l <file>` (chytí syntax, NE API rozdíly!).
- **Před STOR vždy backup live souboru** (`<f>.server-live-bak-<date>`), po uploadu verifikovat `SIZE == local size`, pak curl-ověřit živou funkci endpointu (např. `api.php?action=ping`).
- Po každém deployi: smoke test minimálně `?action=ping`, `?action=list`, a jeden kompletní login cyklus.
- **Temp debug skripty** (ht-*.php) po použití VŽDY smazat z produkce + ověřit 404.

## Bezpečnost (stav 6.10.2026)

- Všechny DB dotazy přes `dbq()` escape; search escapuje i LIKE wildcards
- Rate limiting login/registrace: 10 pokusů / 5 min / (user+IP) → tabulka `klepeto_ht_rate`
- Session: 64-hex token, expirace 24 h, mazání při logoutu/blokaci
- Hesla: hash s fallbackem pro PHP4 (`password_hash_compat`)
- Validace vstupů: username `[a-z0-9_.-]{3,50}`, heslo ≥6 znaků, title bez control znaků ≤200, data ≤200 kB, tónina z whitelistu
- Role: Čtenář (čte+hodnotí) / Editor (zakládá+edituje vlastní) / Admin (vše + správa uživatelů)
- Admin: schvalování registrací, změna rolí, blokování, reset hesla, mazání uživatelů i cizích písní
- Proxy-safe IP pro rate limit (X-Real-IP → X-Forwarded-For → REMOTE_ADDR)
- Response headers: nosniff, DENY frames, no-store

## DB tabulky (MySQL, prefix klepeto_ht_)

- `klepeto_ht_users` — uživatelé (username, pass_hash, role, approved)
- `klepeto_ht_sessions` — session tokeny
- `klepeto_ht_songs` — písně (title, the_key, data=text zápis, author_id, forked_from, version)
- `klepeto_ht_song_versions` — verzování (snapshot před každou editací)
- `klepeto_ht_ratings` — hodnocení (song_id, user_id, stars 1–5)
- `klepeto_ht_rate` — rate-limit čítače

## Formát vstupu melodie

```
title: Na Pankráci
key: F
II:5;F II:6;f II:5;c II:4/5~;F -;f ...
v1: Na Pank-krá-ci | na ma-lém ko-pec-ku ...
```

- Nota: `ŘÁDA:číslo`; skluz `II:6/5`; oblouček na další notu `~`; držení/pauza `-;BAS`
- Basy: velká písmena = tlačící (push), malá = tažný (pull) — F/f, B/b, C/c...
- Nezadané basy se doplňí automaticky dle tóniny (pravidlo I/IV/V)
- `abc:` řádek = import z ABC notace (základní podpora)
- Tónina: F, C, G, A, D, B — změna v UI přetransponuje celou tabulaturu

## Funkce

- Vstup melodie: vlastní text formát, ABC import, upload .txt/.abc souboru
- Tóniny (6) s transpozicí + auto-bas
- Knihovna písní: název, tónina, autor, ★ rating (průměr+počet), vyhledávání
- Účty + role (Čtenář/Editor/Admin), schvalování adminem
- Verzování písní, kopie cizí písně k vlastním úpravám
- Export: tisk/PDF (prohlížečová tisk), HTML

## Rozvoj (nápady)

- Přesné prstoklady per reálné ladění heligonky (po potvrzení mapy uživatelem)
- MIDI import
- Skluzovky jako obloučky přes sloupce (typografie dle předlohy DVD26)