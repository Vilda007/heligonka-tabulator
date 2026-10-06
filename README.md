# Heligonka Tabulator

Webová aplikace pro tvorbu tabulatur pro heligonku (2řadá, C/F ladění) ve formátu klasických zpěvníkových tabulek (řádky II. / I. s čísly tlačítek, řádek B s basy, skluzovky, slohy pod notami). Inspirace: zpěvníkové tabulky typu „Na Pankráci" (DVD26).

Live: https://vilda007.github.io/heligonka-tabulator/

## Funkce (v1)
- Vstup melodie jako jednoduchý text formát (viz níž) + sloky
- Automatický návrh basů podle harmonie (pravidla I-IV-V) s možností ruční opravy v tabulce
- Vykreslení přesně ve stylu předlohy: svislé sloupce s buňkami II./I./B/M, skluzovky (obloučky), přesahy (vlnovky mezi sloupci), značky „1. krát / 2. krát"
- Export: tisk/PDF (prohlížečový print), HTML
- Ukázkové písničky v knihovně („Na Pankráci")

## Formát vstupu (v1, textový)
Jedna píseň = hlavička + taktový zápis:

```
title: Na Pankráci
key: F
# takt: durace noty + melodické tl. (II=2, I=1) + bas
# syntax taktu: [nota:tlacitko, ...] | bas
# nota: cislo tlacitka nebo cislo+směr (např. 5+, skluz 5/6)
```

Přesný parser formátu: `app.js` (sekce FORMAT). Knihovna písniček: `songs/*.txt`.

## Struktura
- `index.html`, `app.js`, `style.css` — SPA bez build nástrojů (GitHub Pages kompatibilní)
- `songs/` — knihovna písniček ve vstupním formátu

## Rozvoj
- Import ABC
- MIDI vstup
- Vlastní ladění heligonky (jiná tóninová dvojice)