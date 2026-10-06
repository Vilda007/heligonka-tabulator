/* Heligonka Tabulator — library.js: knihovna písní (řazení, stránkování, hodnocení, fork) */
let SONGS = [];
let EDITING = null;
const LIB_STATE = { sortKey: 'title', sortDir: 1, page: 0, perPage: 20 };
const LANG_FLAGS = { CZ:'🇨🇿', SK:'🇸🇰', UA:'🇺🇦', PL:'🇵🇱', GE:'🇩🇪', HU:'🇭🇺', RO:'🇷🇴', SI:'🇸🇮', EN:'🇬🇧', FR:'🇫🇷', SP:'🇪🇸', PT:'🇵🇹', NO:'🇳🇴', SE:'🇸🇪', FI:'🇫🇮', IT:'🇮🇹' };
/* obrázková vlaječka (Twemoji SVG) — Windows nerozpoznává vlaječkové emoji v selectech */
const LANG_TWEMOJI = { CZ:'1f1e8-1f1ff', SK:'1f1f8-1f1f0', UA:'1f1fa-1f1e6', PL:'1f1f5-1f1f1', GE:'1f1e9-1f1ea', HU:'1f1ed-1f1fa', RO:'1f1f7-1f1f4', SI:'1f1f8-1f1ee', EN:'1f1ec-1f1f7', FR:'1f1eb-1f1f7', SP:'1f1ea-1f1f8', PT:'1f1f5-1f1f9', NO:'1f1f3-1f1f4', SE:'1f1f8-1f1ea', FI:'1f1eb-1f1ee', IT:'1f1ee-1f1f9' };
function flagImg(lang) {
    const code = LANG_TWEMOJI[lang || 'CZ'];
    if (!code) return '';
    return '<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/' + code + '.svg" alt="' + lang + '" width="18" height="18" style="vertical-align:-4px"> ' + lang;
}

async function loadLibrary() {
    const r = await api('list');
    if (r.status !== 'ok') { $('library-error').textContent = 'Knihovnu nelze načíst: ' + (r.code || '?'); return; }
    SONGS = r.songs || [];
    renderLibrary();
}

/* normalize pro vyhledávání: bez diakritiky, bez velikosti písmen (Věč = vEC) */
function normSearch(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function filteredSongs() {
    const q = normSearch($('lib-search').value);
    const langF = ($('lib-lang-filter') && $('lib-lang-filter').value) || '';
    const mineF = ($('lib-mine-filter') && $('lib-mine-filter').checked) || location.search.indexOf('mine=1') >= 0;
    const user = getUser();
    return SONGS.filter(s =>
        (!mineF || (user && s.author === user.username)) &&
        (!langF || (s.lang || 'CZ') === langF) &&
        (!q || normSearch(s.title).includes(q) || normSearch(s.author).includes(q) || normSearch(s.the_key).includes(q))
    );
}

function renderLibrary() {
    const user = getUser();
    const all = filteredSongs();
    const rows = sortPage(all, LIB_STATE);
    $('lib-thead').innerHTML = sortHeader([
        { key: 'title', label: t('lib.name') },
        { key: 'the_key', label: t('lib.key') },
        { key: 'lang', label: t('lib.lang') },
        { key: 'author', label: t('lib.author') },
        { key: 'rating_avg', label: t('lib.rating') },
        { key: 'completeness', label: t('lib.compl') },
        { key: 'updated_at', label: t('lib.updated') },
        { label: t('lib.actions') }
    ], LIB_STATE);
    $('library-rows').innerHTML = rows.map(s => {
        const mine = user && s.author === user.username;
        const canEdit = (mine && roleCanEdit(user)) || (user && user.role === 'admin');
        const stars = s.rating_avg === null ? '—' : '★'.repeat(Math.round(s.rating_avg)) + '☆'.repeat(5 - Math.round(s.rating_avg));
        return `<tr data-id="${s.id}">
            <td><a href="#" onclick="openSong(${s.id});return false;"><b>${esc(s.title)}</b></a></td>
            <td>${esc(s.the_key)}</td>
            <td>${flagImg(s.lang || 'CZ')}</td>
            <td>${esc(s.author || '')}</td>
            <td>${stars} <small>(${s.rating_count})</small></td>
            <td class="hint" title="II. = druhá řada, I. = první řada, B = basy, M = směr měchu, T = text">${esc(s.completeness || '—')}</td>
            <td class="hint">${esc(s.updated_at || '')}</td>
            <td class="actions">
                ${user ? (canEdit ? `<button class="mini" onclick="editSong(${s.id})" title="Upravit">✏️</button>
                <button class="mini" onclick="deleteSong(${s.id})" title="Smazat">🗑️</button>` : '') : ''}
                ${(!mine && roleCanEdit(user)) ? `<button class="mini" title="Kopírovat k sobě" onclick="forkSong(${s.id})">📄</button>` : ''}
                ${(user && !canEdit && !(!mine && roleCanEdit(user))) ? '&nbsp;' : ''}
            </td>
        </tr>`;
    }).join('');
    $('lib-pager').innerHTML = pagerHtml(all.length, LIB_STATE);
}

async function openSong(id) {
    const r = await api('get&id=' + id);
    if (r.status !== 'ok') { alert('Píseň nelze načíst: ' + (r.code || '?')); return; }
    const s = r.song;
    EDITING = s;
    localStorage.setItem('ht_edit_song', JSON.stringify({ id: s.id, title: s.title, key: s.the_key, data: s.data, version: s.version }));
    location.href = 'index.html?pisen=' + s.id + '&ts=' + Date.now();
}
async function editSong(id) { openSong(id); }

async function deleteSong(id) {
    if (!confirm('Smazat píseň?')) return;
    const r = await api('delete', { method: 'POST', body: { id } });
    if (r.status !== 'ok') { alert('Mazání selhalo: ' + (r.code || '?')); return; }
    await loadLibrary();
}

async function forkSong(id) {
    if (!roleCanEdit(getUser())) { alert('Kopírovat k sobě může jen editor.'); return; }
    const r = await api('fork', { method: 'POST', body: { id } });
    if (r.status !== 'ok') { alert('Kopírování selhalo: ' + (r.code || '?')); return; }
    await loadLibrary();
    openSong(r.id);
}

/* Nová píseň — dotaz na název, vytvoří prázdnou píseň a otevře ji v Tabulátoru */
async function newSong() {
    const user = getUser();
    if (!roleCanEdit(user)) { alert('Zakládat písně může jen editor. Napiš adminovi, ať ti dá roli Editor.'); return; }
    const title = prompt('Název nové písně:');
    if (!title || !title.trim()) return;
    const r = await api('create', { method: 'POST', body: { title: title.trim(), key: 'F', data: 'II:1;F', published: 1 } });
    if (r.status !== 'ok') { alert('Vytvoření selhalo: ' + (r.code || '?')); return; }
    await loadLibrary();
    openSong(r.id);
}

async function saveSong() {
    const user = getUser();
    if (!roleCanEdit(user)) { alert('Ukládat mohou jen editoři. Napiš adminovi, ať ti dá roli Editor.'); return; }
    const title = ($('song-title') && $('song-title').value.trim()) || EDITING.title || 'Bez názvu';
    const payload = { title, key: $('key') ? $('key').value : EDITING.the_key, data: $('input') ? $('input').value : EDITING.data, lang: ($('song-lang') && $('song-lang').value) || EDITING.lang || 'CZ' };
    let r;
    if (EDITING) { payload.id = EDITING.id; r = await api('update', { method: 'POST', body: payload }); }
    else { r = await api('create', { method: 'POST', body: payload }); }
    if (r.status !== 'ok') { alert('Uložení selhalo: ' + (r.code || '?')); return; }
    $('save-status').textContent = 'Uloženo ✓ (v' + (r.version || 1) + ')';
    EDITING = null;
    await loadLibrary();
}

async function rateSong(id, stars) {
    if (!getUser()) { alert('Hodnotit mohou jen přihlášení.'); return; }
    const r = await api('rate', { method: 'POST', body: { id, stars } });
    if (r.status !== 'ok') { alert('Hodnocení selhalo: ' + (r.code || '?')); return; }
    await loadLibrary();
}

/* share links pro otevřenou píseň (index #share-box) */
function updateShareLinks(s) {
    const box = $('share-box');
    if (!box) return;
    const url = location.origin + location.pathname.replace(/[^/]*$/, '') + '?pisen=' + s.id;
    const title = 'Heligonka tabulatura: ' + s.title;
    const enc = encodeURIComponent(url), et = encodeURIComponent(title);
    const links = {
        fb: 'https://www.facebook.com/sharer/sharer.php?u=' + enc,
        bs: 'https://bsky.app/intent/compose?text=' + et + '%20' + enc,
        x: 'https://twitter.com/intent/tweet?text=' + et + '&url=' + enc,
        wa: 'https://wa.me/?text=' + et + '%20' + enc,
        mail: 'mailto:?subject=' + et + '&body=' + url
    };
    const linkLbl = (typeof t === 'function') ? t('msg.link') : '🔗 Odkaz na píseň: ';
    const copiedLbl = (typeof t === 'function') ? t('msg.copied') : 'Odkaz zkopírován';
    box.innerHTML = '<span class="hint">' + linkLbl + '<code id="song-url">' + esc(url) + '</code></span> ' +
        Object.keys(links).map(k => '<a class="sharebtn" target="_blank" rel="noopener" href="' + links[k] + '">' + {fb:'Facebook',bs:'Bluesky',x:'X',wa:'WhatsApp',mail:'E-mail'}[k] + '</a>').join(' ') +
        ' <button class="mini" onclick="navigator.clipboard.writeText(document.getElementById(\'song-url\').textContent);alert(\'' + copiedLbl + '\')">📋</button>';
    box.style.display = 'block';
}

/* ---------- init (jen na stránce knihovny) ---------- */
window.addEventListener('DOMContentLoaded', () => {
    if (!$('library-rows')) return; // jen knihovna.html
    renderAuth();
    loadLibrary();
    $('lib-search').addEventListener('input', () => { LIB_STATE.page = 0; renderLibrary(); });
    const lf = $('lib-lang-filter');
    if (lf) lf.addEventListener('change', () => { LIB_STATE.page = 0; renderLibrary(); });
    const mf = $('lib-mine-filter');
    if (mf) {
        if (location.search.indexOf('mine=1') >= 0) mf.checked = true;
        mf.addEventListener('change', () => { LIB_STATE.page = 0; renderLibrary(); });
        if (!getUser()) mf.parentElement.style.display = 'none';
    }
    wireSortPager($('lib-thead'), $('lib-pager'), LIB_STATE, renderLibrary);
    /* nepřihlášení: žádné akční tlačítka (jen prohlížení) */
    const nw = $('new-song');
    if (nw) { nw.addEventListener('click', newSong); if (!getUser()) nw.style.display = 'none'; }
    $('library-rows').addEventListener('click', (e) => {
        if (e.target.classList.contains('star')) {
            const tr = e.target.closest('tr');
            rateSong(+tr.dataset.id, +e.target.dataset.stars);
        }
    });
});
function renderAuth() {
    const box = $('auth-box');
    if (!box) return;
    const user = getUser();
    box.innerHTML = user
        ? `<div class="authline">👤 <b>${esc(user.username)}</b> (${esc(user.role)}) — přihlášen</div>`
        : `<div class="authline">
             <input id="login-user" placeholder="jméno" size="10">
             <input id="login-pass" type="password" placeholder="heslo" size="10">
             <button class="mini" onclick="doLogin()">Přihlásit</button>
             <button class="mini" onclick="doRegister()">Registrovat</button>
           </div><div id="login-msg" class="hint"></div>`;
    const lu = $('login-user'), lp = $('login-pass');
    if (lu) { lu.onkeydown = e => { if (e.key === 'Enter') doLogin(); }; lp.onkeydown = e => { if (e.key === 'Enter') doLogin(); }; }
}