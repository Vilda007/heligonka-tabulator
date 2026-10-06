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
  'ak.dir':     { CZ: 'Směr měchu', EN: 'Bellows direction' }
};

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
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
}