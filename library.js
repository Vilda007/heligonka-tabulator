/* Heligonka Tabulator — library.js: knihovna písní (řazení, stránkování, hodnocení, fork) */
let SONGS = [];
let EDITING = null;
const LIB_STATE = { sortKey: 'title', sortDir: 1, page: 0, perPage: 10 };

async function loadLibrary() {
    const r = await api('list');
    if (r.status !== 'ok') { $('library-error').textContent = 'Knihovnu nelze načíst: ' + (r.code || '?'); return; }
    SONGS = r.songs || [];
    renderLibrary();
}

function filteredSongs() {
    const q = ($('lib-search').value || '').toLowerCase();
    return SONGS.filter(s =>
        !q || s.title.toLowerCase().includes(q) || (s.author || '').toLowerCase().includes(q) || (s.the_key || '').toLowerCase().includes(q)
    );
}

function renderLibrary() {
    const user = getUser();
    const all = filteredSongs();
    const rows = sortPage(all, LIB_STATE);
    $('lib-thead').innerHTML = sortHeader([
        { key: 'title', label: 'Název' },
        { key: 'the_key', label: 'Tónina' },
        { key: 'author', label: 'Autor' },
        { key: 'rating_avg', label: 'Hodnocení' },
        { key: 'updated_at', label: 'Upraveno' },
        { label: 'Akce' }
    ], LIB_STATE);
    $('library-rows').innerHTML = rows.map(s => {
        const mine = user && s.author === user.username;
        const canEdit = (mine && roleCanEdit(user)) || (user && user.role === 'admin');
        const stars = s.rating_avg === null ? '—' : '★'.repeat(Math.round(s.rating_avg)) + '☆'.repeat(5 - Math.round(s.rating_avg));
        return `<tr data-id="${s.id}">
            <td><a href="#" onclick="openSong(${s.id});return false;"><b>${esc(s.title)}</b></a></td>
            <td>${esc(s.the_key)}</td>
            <td>${esc(s.author || '')}</td>
            <td>${stars} <small>(${s.rating_count})</small></td>
            <td class="hint">${esc(s.updated_at || '')}</td>
            <td class="actions">
                ${canEdit ? `<button class="mini" onclick="editSong(${s.id})" title="Upravit">✏️</button>
                <button class="mini" onclick="deleteSong(${s.id})" title="Smazat">🗑️</button>` : ''}
                <button class="mini" title="Kopírovat k sobě" onclick="forkSong(${s.id})">📄</button>
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
    location.href = 'index.html?pisen=' + s.id;
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

async function saveSong() {
    const user = getUser();
    if (!roleCanEdit(user)) { alert('Ukládat mohou jen editoři. Napiš adminovi, ať ti dá roli Editor.'); return; }
    const title = EDITING ? EDITING.title : (($('song-title') && $('song-title').value.trim()) || prompt('Název písně:') || 'Bez názvu');
    const payload = { title, key: $('key') ? $('key').value : EDITING.the_key, data: $('input') ? $('input').value : EDITING.data };
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
    box.innerHTML = '<span class="hint">🔗 Odkaz na píseň: <code id="song-url">' + esc(url) + '</code></span> ' +
        Object.keys(links).map(k => '<a class="sharebtn" target="_blank" rel="noopener" href="' + links[k] + '">' + {fb:'Facebook',bs:'Bluesky',x:'X',wa:'WhatsApp',mail:'E-mail'}[k] + '</a>').join(' ') +
        ' <button class="mini" onclick="navigator.clipboard.writeText(document.getElementById(\'song-url\').textContent);alert(\'Odkaz zkopírován\')">📋</button>';
    box.style.display = 'block';
}

/* ---------- init (jen na stránce knihovny) ---------- */
window.addEventListener('DOMContentLoaded', () => {
    if (!$('library-rows')) return; // jen knihovna.html
    renderAuth();
    loadLibrary();
    $('lib-search').addEventListener('input', () => { LIB_STATE.page = 0; renderLibrary(); });
    wireSortPager($('lib-thead'), $('lib-pager'), LIB_STATE, renderLibrary);
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