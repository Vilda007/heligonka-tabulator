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
  'acc.del2':   { CZ: 'POSLEDNÍ POTVRZENÍ: smazat účet natrvalo?', EN: 'FINAL CONFIRMATION: delete the account permanently?' }
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