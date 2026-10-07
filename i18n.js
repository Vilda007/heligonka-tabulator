/* Heligonka Tabulator — i18n.js (v7)
   Jazyk UI: CZ (default) / EN. Jazyk se bere z profilu uživatele (ui_lang),
   fallback localStorage. Překlady přes data-i18n atributy + t() funkce v JS. */

const UI_LANGS = { CZ: 'Čeština', EN: 'English' };

const I18N = {
  /* menu */
  'menu.tab':   { CZ: '🎹 Tabulátor', EN: '🎹 Tabulator' },
  'menu.lib':   { CZ: '📚 Knihovna', EN: '📚 Library' },
  'menu.usr':   { CZ: '👥 Uživatelé', EN: '👥 Users' },
  'menu.acc':   { CZ: '👤 Můj účet', EN: '👤 My account' },
  'menu.ak':    { CZ: '🎼 Akordy', EN: '🎼 Chords' },
  'menu.pred':  { CZ: '🖨️ Předloha', EN: '🖨️ Blank sheet' },
  'menu.help':  { CZ: '❓ Nápověda', EN: '❓ Help' },
  'menu.login': { CZ: 'Přihlásit / registrovat', EN: 'Log in / register' },
  'menu.logout':{ CZ: 'Odhlásit', EN: 'Log out' },
  /* tabulátor */
  'tab.title':  { CZ: '🎹 Heligonka Tabulator', EN: '🎹 Heligonka Tabulator' },
  'tab.lead':   { CZ: 'Zadej melodii, vyber tóninu — aplikace transponuje a vykreslí tabulaturu. Import z MIDI/XLS/textu, export, tisk.',
                  EN: 'Enter a melody, pick a key — the app transposes and renders the tablature. Import from MIDI/XLS/text, export, print.' },
  'tab.melody': { CZ: '1. Melodie', EN: '1. Melody' },
  'tab.key':    { CZ: 'Tónina:', EN: 'Key:' },
  'tab.lang':   { CZ: 'Jazyk:', EN: 'Language:' },
  'tab.import': { CZ: 'Import:', EN: 'Import:' },
  'tab.render': { CZ: 'Vygenerovat tabulaturu', EN: 'Generate tablature' },
  'tab.save':   { CZ: '💾 Uložit do knihovny', EN: '💾 Save to library' },
  'tab.xls':    { CZ: '📊 Export XLS', EN: '📊 Export XLS' },
  'tab.midi':   { CZ: '🎵 Export MIDI', EN: '🎵 Export MIDI' },
  'tab.alts':   { CZ: '🔀 Alternativy', EN: '🔀 Alternates' },
  'tab.osnova': { CZ: '🎼 Osnova', EN: '🎼 Staff' },
  'tab.hmatnik':{ CZ: '⌨️ Hmatník', EN: '⌨️ Button board' },
  'tab.output': { CZ: '2. Tabulatura', EN: '2. Tablature' },
  'tab.print':  { CZ: '🖨️ Tisk / PDF', EN: '🖨️ Print / PDF' },
  'tab.copy':   { CZ: '📋 Kopírovat HTML', EN: '📋 Copy HTML' },
  'tab.name':   { CZ: 'Název:', EN: 'Title:' },
  /* knihovna */
  'lib.title':  { CZ: '📚 Knihovna písní', EN: '📚 Song library' },
  'lib.search': { CZ: '🔍 Hledat (název / autor / tónina)', EN: '🔍 Search (title / author / key)' },
  'lib.langf':  { CZ: 'Jazyk:', EN: 'Language:' },
  'lib.all':    { CZ: 'Všechny', EN: 'All' },
  'lib.new':    { CZ: '➕ Nová píseň', EN: '➕ New song' },
  'lib.name':   { CZ: 'Název', EN: 'Title' },
  'lib.key':    { CZ: 'Tónina', EN: 'Key' },
  'lib.lang':   { CZ: 'Jazyk', EN: 'Language' },
  'lib.author': { CZ: 'Autor', EN: 'Author' },
  'lib.rating': { CZ: 'Hodnocení', EN: 'Rating' },
  'lib.compl':  { CZ: 'Úplnost', EN: 'Completeness' },
  'lib.updated':{ CZ: 'Upraveno', EN: 'Updated' },
  'lib.actions':{ CZ: 'Akce', EN: 'Actions' },
  /* můj účet */
  'acc.title':  { CZ: '👤 Můj účet', EN: '👤 My account' },
  'acc.lead':   { CZ: 'Nastavení tvého účtu: heslo, nástroj, jazyky, bio.', EN: 'Your account settings: password, instrument, languages, bio.' },
  'acc.pass':   { CZ: 'Změna hesla', EN: 'Change password' },
  'acc.oldpass':{ CZ: 'Staré heslo:', EN: 'Old password:' },
  'acc.newpass':{ CZ: 'Nové heslo:', EN: 'New password:' },
  'acc.chgpass':{ CZ: 'Změnit heslo', EN: 'Change password' },
  'acc.tool':   { CZ: '🎻 Můj nástroj', EN: '🎻 My instrument' },
  'acc.rows':   { CZ: 'Řady:', EN: 'Rows:' },
  'acc.buttons':{ CZ: 'Knoflíků na řadu:', EN: 'Buttons per row:' },
  'acc.tuning': { CZ: 'Ladění:', EN: 'Tuning:' },
  'acc.save':   { CZ: '💾 Uložit nástroj', EN: '💾 Save instrument' },
  'acc.deflang':{ CZ: 'Výchozí jazyk nových písní:', EN: 'Default language for new songs:' },
  'acc.uilang': { CZ: 'Jazyk rozhraní:', EN: 'Interface language:' },
  'acc.saveprof':{ CZ: '💾 Uložit profil', EN: '💾 Save profile' },
  'acc.bio':    { CZ: 'Bio:', EN: 'Bio:' },
  'acc.biohint':{ CZ: 'Krátký text o tobě (max 500 znaků, bez HTML).', EN: 'A short text about you (max 500 chars, no HTML).' },
  'acc.delete': { CZ: '🗑️ Smazat účet', EN: '🗑️ Delete account' },
  'acc.delhint':{ CZ: 'Smazání účtu je nevratné. Tvoje písně zůstávají v knihovně (bez autora).', EN: 'Account deletion is irreversible. Your songs stay in the library (without author).' },
  'acc.delbtn': { CZ: 'Smazat účet', EN: 'Delete account' },
  'acc.del1':   { CZ: 'Opravdu smazat účet? Tvoje písně zůstanou, ale ztratíš přihlášení a hodnocení.', EN: 'Really delete your account? Your songs remain, but you lose login and ratings.' },
  'acc.del2':   { CZ: 'POSLEDNÍ POTVRZENÍ: smazat účet natrvalo?', EN: 'FINAL CONFIRMATION: delete the account permanently?' },
  'lib.mine':   { CZ: 'Jen moje', EN: 'Only mine' },
  /* stránky — doplněno z auditu (dříve hardcoded CZ v EN režimu) */
  'lib.lead':   { CZ: 'Všechny písně všech uživatelů. Klikni na název pro otevření v tabulátoru, seřaď kliknutím na záhlaví.', EN: 'All songs by all users. Click a title to open it in the tabulator, sort by clicking a column header.' },
  'acc.login': { CZ: '🔑 Přihlášení / registrace', EN: '🔑 Log in / register' },
  'acc.loginbtn': { CZ: 'Přihlásit', EN: 'Log in' },
  'acc.regbtn': { CZ: 'Registrovat', EN: 'Register' },
  'acc.reghint':{ CZ: 'Registrace čeká na schválení adminem. První krok k ukládání písní: role Editor.', EN: 'Registration waits for admin approval. First step to saving songs: the Editor role.' },
  'acc.stats':  { CZ: '📊 Moje statistiky', EN: '📊 My stats' },
  'usr.title':  { CZ: '👥 Správa uživatelů', EN: '👥 User management' },
  'usr.lead':   { CZ: 'Pouze pro adminy. Schvalování registrací, role, blokování, reset hesel.', EN: 'Admins only. Approving registrations, roles, blocking, password resets.' },
  'usr.pending':{ CZ: 'Čeká na schválení', EN: 'Pending approval' },
  'usr.none':   { CZ: 'Nikdo nečeká.', EN: 'Nobody is waiting.' },
  'usr.all':    { CZ: 'Všichni uživatelé', EN: 'All users' },
  'usr.name':   { CZ: 'Jméno', EN: 'Name' },
  'usr.role':   { CZ: 'Role', EN: 'Role' },
  'usr.state':  { CZ: 'Stav', EN: 'Status' },
  'usr.created':{ CZ: 'Registrován', EN: 'Registered' },
  'usr.approved':{ CZ: '✓ schválen', EN: '✓ approved' },
  'usr.waiting':{ CZ: '⏳ čeká', EN: '⏳ pending' },
  'usr.reader': { CZ: '✓ Čtenář', EN: '✓ Reader' },
  'usr.editor': { CZ: '✓ Editor', EN: '✓ Editor' },
  'pred.title': { CZ: '🖨️ Prázdná tisková předloha', EN: '🖨️ Blank print sheet' },
  'pred.lead':  { CZ: 'Prázdná tabulatura pro ruční zápis hmatů — vytiskni si (nebo ulož jako PDF) a piš na papír jako do notáčku.', EN: 'A blank tablature for handwriting — print it (or save as PDF) and write on paper like a songbook.' },
  'pred.rows':  { CZ: 'Počet řádků (systémů):', EN: 'Rows (systems):' },
  'pred.cols':  { CZ: 'Sloupců na řádek:', EN: 'Columns per row:' },
  'pred.gen':   { CZ: 'Vygenerovat', EN: 'Generate' },
  'pred.empty': { CZ: '(prázdné)', EN: '(empty)' },
  'pred.name':  { CZ: 'Název písně:', EN: 'Song title:' },
  'pred.tip':   { CZ: 'Tip: v tiskovém dialogu zvol „Uložit jako PDF“ pro elektronickou verzi. Doporučeno A4 na výšku.', EN: 'Tip: choose “Save as PDF” in the print dialog for an electronic copy. A4 portrait recommended.' },
  'ak.title':   { CZ: '🎼 Akordová tabulka', EN: '🎼 Chord chart' },
  'ak.lead':    { CZ: 'Hmaty akordů na heligonce (zdroj: Akordy.xls, notace německá — es=Eb, as=Ab, b=B; číslice = oktáva). „Tlak“ = tlačený měch, „Tah“ = tahnutý.', EN: 'Chord shapes for the heligonka (German note naming — es=Eb, as=Ab, b=B; digit = octave). “Tlak” = bellows push, “Tah” = bellows pull.' },
  'ak.chord':   { CZ: 'Akord', EN: 'Chord' },
  'ak.notes':   { CZ: 'Noty (knoflíky)', EN: 'Notes (buttons)' },
  'ak.dir':     { CZ: 'Směr měchu', EN: 'Bellows direction' },
  /* tóniny — popisek pod volbou */
  'keyinfo.F':  { CZ: 'F dur (klasika, 2řadá C/F — hraje se v F)', EN: 'F major (classic 2-row C/F — played in F)' },
  'keyinfo.C':  { CZ: 'C dur (kontra, hraje se v C)', EN: 'C major (kontra, played in C)' },
  'keyinfo.G':  { CZ: 'G dur (transpozice — tóniny mimo C/F vyžadují jiný lad na heligonce, mapy jsou orientační)', EN: 'G major (transposition — keys beyond C/F need a different tuning, maps are approximate)' },
  'keyinfo.A':  { CZ: 'A dur (orientační mapa)', EN: 'A major (approximate map)' },
  'keyinfo.D':  { CZ: 'D dur (orientační mapa)', EN: 'D major (approximate map)' },
  'keyinfo.Bb': { CZ: 'B dur (orientační mapa)', EN: 'B♭ major (approximate map)' },
  /* hlášky */
  'msg.editing': { CZ: 'Editace: ', EN: 'Editing: ' },
  'msg.link':   { CZ: '🔗 Odkaz na píseň: ', EN: '🔗 Song link: ' },
  'msg.copied': { CZ: 'Odkaz zkopírován', EN: 'Link copied' },
  'foot.bugs': { CZ: 'chyby hlaste jako', EN: 'report bugs as' },
  /* formát vstupu hint */
  'hint.format': { CZ: 'Formát: title:, key:, nebo abc: (jednořádkový ABC zápis → automatický převod).', EN: 'Format: title:, key:, or abc: (single-line ABC notation → automatic conversion).' },
  'hint.note':  { CZ: 'Nota: II:5;F (řáda II, tlačítko 5, bas F stlačený) · II:6/5;f (skluz 6→5) · I:8;f~ (oblouček na další notu) · -;C (drž/pauza) · >>;B (skluz doprava).', EN: 'Note: II:5;F (row II, button 5, bass F on push) · II:6/5;f (glide 6→5) · I:8;f~ (slur to next note) · -;C (hold/rest) · >>;B (slide right).' },
  'hint.verses': { CZ: 'Sloky: v1: text, svislítko | odděluje fráze', EN: 'Verses: v1: text, pipe | separates phrases' },
  'hint.bass':  { CZ: 'Basy se doplní automaticky dle tóniny, pokud je nezadáš.', EN: 'Basses are auto-filled per key if you don\'t enter them.' },
  /* pager + knihovna hinty */
  'lib.page':   { CZ: 'Strana', EN: 'Page' },
  'lib.ratehint': { CZ: 'Hodnocení: klikni na hvězdičky v detailu písně (přihlášení uživatelé). Kopírování k sobě (📄) může editor.', EN: 'Rating: click the stars in the song detail (logged-in users). Copying to yourself (📄) is for editors.' },
  /* akordy */
  'ak.notation': { CZ: 'Označení: c1 = tón c v jednolinkové oktávě, es = Eb, as = Ab, b = B/H, gis = G#. Německá notová konvence.', EN: 'Notation: c1 = note c in the one-line octave, es = Eb, as = Ab, b = B/H, gis = G#. German note convention.' },
  'ak.push':   { CZ: 'Tlak', EN: 'Push' },
  'ak.pull':   { CZ: 'Tah', EN: 'Pull' },
  'ak.both':   { CZ: '—', EN: '—' },
  /* předloha */
  'pred.songname': { CZ: 'Název písně', EN: 'Song title' },
  'pred.key2':  { CZ: 'Tónina', EN: 'Key' },
  'pred.printbtn': { CZ: '🖨️ Tisk / PDF', EN: '🖨️ Print / PDF' },
  /* účet statistiky */
  'stats.songs': { CZ: 'píseň', EN: 'song' },
  'stats.songs2': { CZ: 'písně', EN: 'songs' },
  'stats.songs5': { CZ: 'písní', EN: 'songs' },
  'stats.best': { CZ: '🏆 nejlépe hodnocená:', EN: '🏆 best rated:' },
  'stats.nobest': { CZ: '🏆 zatím žádná hodnocená píseň', EN: '🏆 no rated song yet' },
  'stats.mysongs': { CZ: '📚 Moje knihovna →', EN: '📚 My library →' },
  'stats.loading': { CZ: 'Načítám…', EN: 'Loading…' },
  'help.czechonly': { CZ: '', EN: 'ℹ️ This help page is currently available in Czech only.' },
  /* hinty s HTML značkami (data-i18n-html) */
  'hint.format.html': { CZ: '<b>Grid-Text formát:</b> řádky začínají <code>|</code>, každý sloupec = <code>směr;melodie;basy</code>.<br>Směr: <code>&gt;</code> nový tlak, <code>&gt;&gt;</code> prodloužení, <code>&lt;</code> nový tah, <code>&lt;&lt;</code> prodloužení.<br>Melodie: <code>II:6,5</code> (dva knoflíky nad sebou), <code>II:5+I:8</code> (akord přes řady), <code>~</code> oblouček, <code>-</code> držení, <code>.</code> prázdné.<br>Basy za <code>;</code>: velké = bas, malé = akord, obojí <code>;Ff</code>. Takty <code>|</code>, repetice <code>|:</code> <code>:|</code>, volty <code>[1]</code> <code>[2]</code>.<br>Text: <code>TXT:</code> řádek pod notami — slabika 1:1 na sloupec, <code>_</code> = prázdné.<br>Starý formát (řádky <code>II:5;F</code> bez <code>|</code>) stále funguje.',
    EN: '<b>Grid-Text format:</b> lines start with <code>|</code>, each column = <code>direction;melody;basses</code>.<br>Direction: <code>&gt;</code> new push, <code>&gt;&gt;</code> continuation, <code>&lt;</code> new pull, <code>&lt;&lt;</code> continuation.<br>Melody: <code>II:6,5</code> (two buttons stacked), <code>II:5+I:8</code> (cross-row chord), <code>~</code> slur, <code>-</code> hold, <code>.</code> empty.<br>Basses after <code>;</code>: uppercase = bass, lowercase = chord, both <code>;Ff</code>. Bars <code>|</code>, repeats <code>|:</code> <code>:|</code>, voltas <code>[1]</code> <code>[2]</code>.<br>Lyrics: <code>TXT:</code> line below notes — one syllable per column, <code>_</code> = empty.<br>The old row format still works.' },
  /* tooltipy hlavních ovládacích prvků (aplikují se programově) */
  'tt.render':  { CZ: 'Vykreslí tabulaturu z aktuálního textu', EN: 'Render the tablature from the current text' },
  'tt.save':   { CZ: 'Uloží píseň do knihovny (jen Editor/Admin; každá editace = nová verze)', EN: 'Save the song to the library (Editor/Admin only; each edit = a new version)' },
  'tt.xls':    { CZ: 'Export písně do .xls (notovací tabulka — německá notace, Tlak/Tah, basy)', EN: 'Export the song to .xls (notation table — German naming, push/pull, basses)' },
  'tt.midi':   { CZ: 'Export písně do .mid (melodie + basy, 120 BPM)', EN: 'Export the song to .mid (melody + basses, 120 BPM)' },
  'tt.alts':   { CZ: 'Zobrazí pod každou notu alternativní knoflíky se stejným tónem (jiná řada/pozice) — orientační', EN: 'Show alternate buttons with the same tone under each note (other row/position) — approximate' },
  'tt.osnova': { CZ: 'Vykreslí melodii v notové osnově (VexFlow) pod tabulaturou', EN: 'Render the melody on a music staff (VexFlow) under the tablature' },
  'tt.hmatnik': { CZ: 'Zobrazí klikací hmatník — nota se skládá klikáním na knoflíky místo psaním', EN: 'Show the clickable button board — build notes by clicking buttons instead of typing' },
  'tt.key':    { CZ: 'Tónina heligonky — změna přetransponuje celou tabulaturu (čísla tlačítek i basy)', EN: 'Heligonka key — changing re-transposes the whole tablature (button numbers and basses)' },
  'tt.file':   { CZ: 'Nahraj soubor: .txt/.abc (text), .mid/.midi (MIDI) nebo .xls/.xlsx (notovací tabulka)', EN: 'Upload a file: .txt/.abc (text), .mid/.midi (MIDI) or .xls/.xlsx (notation table)' },
  'tt.title':  { CZ: 'Název písně — použije se při ukládání', EN: 'Song title — used when saving' },
  'tt.search': { CZ: 'Hledá ve všech písních (název / autor / tónina)', EN: 'Searches all songs (title / author / key)' },
  'tt.langf':  { CZ: 'Filtr písní podle jazyka', EN: 'Filter songs by language' },
  'tt.new':    { CZ: 'Založí novou píseň (dotaz na název) a otevře ji v Tabulátoru', EN: 'Create a new song (asks for a title) and open it in the Tabulator' },
  'tt.textarea': { CZ: 'Melodie v textovém formátu: ŘÁDA:tlačítko;BAS — detaily v Nápovědě', EN: 'Melody in text format: ROW:button;BASS — details in Help' }
};
/* aplikace tooltipů na známé ID prvku */
const I18N_TOOLTIPS = { render: 'tt.render', 'save-song': 'tt.save', 'export-xls': 'tt.xls', 'export-midi': 'tt.midi', 'toggle-alts': 'tt.alts', 'toggle-osnova': 'tt.osnova', 'toggle-hmatnik': 'tt.hmatnik', key: 'tt.key', file: 'tt.file', 'song-title': 'tt.title', 'lib-search': 'tt.search', 'lib-lang-filter': 'tt.langf', 'new-song': 'tt.new', input: 'tt.textarea' };

/* aktivní jazyk UI */
function getUiLang() {
    const user = getUser();
    if (user && user.ui_lang) return user.ui_lang;
    try { return localStorage.getItem('ht_ui_lang') || 'CZ'; } catch (e) { return 'CZ'; }
}
function setUiLang(l) { localStorage.setItem('ht_ui_lang', l === 'EN' ? 'EN' : 'CZ'); }

/* překlad řetězce */
function t(key) {
    const e = I18N[key];
    if (!e) return key;
    return e[getUiLang()] || e.CZ || key;
}

/* aplikuj data-i18n atributy na elementy stránky */
function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (val && val !== key) el.textContent = val;
    });
    /* HTML varianty (hinty s <code> značkami) */
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        const e = I18N[key];
        const val = e ? (e[getUiLang()] || e.CZ) : null;
        if (val && val !== key && typeof val === 'string' && val !== '') el.innerHTML = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    /* tooltipy přes mapu ID (I18N_TOOLTIPS) */
    for (const id in I18N_TOOLTIPS) {
        const el = (typeof $ !== 'undefined') ? $(id) : document.getElementById(id);
        if (el) el.setAttribute('title', t(I18N_TOOLTIPS[id]));
    }
}