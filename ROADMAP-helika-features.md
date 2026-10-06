# Roadmap — featury inspirované programem Helíka (info.hudbacd.cz)

Zdroj: https://info.hudbacd.cz/download.htm?q=subdom/info/old/download.htm (download stránka programu Helík, autor Jaroslav Mazura). Stav k 6.10.2026 — naše app: https://klepeto.kuzelovi.cz/heligonka/

## Featury Helíky k implementaci (postupně)

### 1. Grafický záznam hmatů — klikací hmatník 🔥
Helík: „grafický záznam jednotlivých hmatů, které hráč používá" — hráč kliká na knoflíky hmatníku, program to převádí do textového formátu.
- **Naše verze:** interaktivní hmatník heligonky (2 řady diskant + basová řada), klik na knoflík = nota, automaticky se skládá do textového editoru. Nejrychlejší způsob zadávání.

### 2. Alternativy hmatů — všechny způsoby, jak zahrát tutéž melodii 🔥
Helík: „při čtení dat program umí nejen zobrazit původní styl, ale i všechny ostatní možné alternativy, jak lze zahrát tutéž melodii" (verze 1.3+).
- **Naše verze:** tlačítko „Alternativy" — pro každou notu vypsat alternativní knoflíky (stejný tón na jiném knoflíku/řadě), celé skladby v alternativním prstokladu. Klíčová výuková featura Helíky, nemáme nic podobného.

### 3. Zápis i z not — notová osnova 🔥
Helík 1.7: „grafický zápis přímo do notové osnovy. To umožní např. opsání skladby ze zpěvníku a zápis nových skladeb i bez pomoci heligonky."
- **Naše verze:** (a) **zobrazení not** — vykreslit melodii v notové osnově vedle tabulatury (1.6+ Helík umí zobrazit noty); (b) **zápis z not** — klikání do notové osnovy / rozparsování notového zápisu. Částečně kryje náš ABC import, ale plná osnova je silnější.

### 4. Konverze do jiných ladění ✅ (máme)
Helík 1.4: „Konverze do jiných ladění."
- **Naše:** tóninový selektor s transpozicí — hotovo (F/C/G/A/D/Bb). Doladit: ověřené mapy pro G/A/D/Bb proti skutečnému nástroji.

### 5. Záznam pro obě ruce ✅/částečně
Helík 1.4: „Záznam a zobrazení pro obě ruce."
- **Naše:** máme basy v tabulatuře (B sloupec) i v XLS importu; chybí plná basová tastatura (akordové basy standard/kontrabas — Helík řeší jen „ orientační zápis basů", což odpovídá našemu stavu).

### 6. Vlastní datové soubory dle nástroje
Helík: „Kdo vlastní heligonku bez stojacího knoflíku, nebo s jiným počtem než jeden… bude mu zaslán speciální datový soubor podle jeho nástroje."
- **Naše verze:** konfigurovatelný layout nástroje (počet řad, počet knoflíků, ladění) per uživatel — „můj nástroj" v profilu, podle kterého se generuje tabulatura a hmatník.

### 7. Tisk prázdného hmatníku (PDF předloha)
Helík: „prázdný hmatník chromatiky ve verzi pro tisk… natisknou si předlohy, do kterých pak ručně zapisují hmaty."
- **Naše verze:** vygenerovat a vytisknout prázdnou tabulatu / hmatník pro ruční zápis — triviální přes existující print CSS.

### 8. Chromatika — knoflíkový akordeon (Sonorex XII)
Samostatný program Helíkova autora pro chromatiku („Zápis i z not").
- **Naše verze (vzdálenější):** podpora pro jiný nástroj = jiná mapa knoflíků + jiné sloupce. Architektonicky jsme připraveni (KEYMAPS per tónina), ale je to nový produkt. Až po heligonce.

## Co máme už dnes (pro srovnání, Helík nemá)
- 🌐 webová app, žádná instalace, žádný Excel (Helík vyžaduje MS Office!)
- 📚 knihovna písní online, účty, role, hodnocení, fork, verze, vyhledávání
- 🎹 MIDI import (automatické rozpoznání not + detekce tóniny)
- 📊 XLS import (Helíkův vlastní formát čteme — naše písničky z jeho ekosystému)
- 🖨️ tisk/PDF, copy-HTML, deep links, sdílení
- 🆓 zdarma (Helík 1.7 = trial 30 dní, licence 250 Kč)

## Priorita (návrh Vilda → rozhodne)
1. **Alternativy hmatů** (#2) — jedinečná hodnota Helíky, jednoduchá mapa alternativa (stejný tón jinde)
2. **Klikací hmatník** (#1) — zadávání bez znalosti textového formátu
3. **Notová osnova — zobrazení** (#3a) — osnovu umí vykreslit knihovna (VexFlow); #3b zápis do osnovy později
4. **Layout nástroje** (#6) — po ověření map reálných nástrojů
5. **Prázdná předloha** (#7) — quick win
6. **Chromatika** (#8) — odloženo

*<!-- project: path:/home/vildadmin/.openclaw/workspace -->*