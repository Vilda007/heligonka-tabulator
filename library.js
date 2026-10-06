/* Heligonka Tabulator v3 — library, auth, backend wiring (PHP API) */
/* API base: same host, /heligonka/api.php */
const API = 'https://klepeto.kuzelovi.cz/heligonka/api.php';

/* ---------- session ---------- */
function getSid() { return localStorage.getItem('ht_sid') || ''; }
function getUser() { try { return JSON.parse(localStorage.getItem('ht_user') || 'null'); } catch (e) { return null; } }
function setAuth(sid, user) { localStorage.setItem('ht_sid', sid); localStorage.setItem('ht_user', JSON.stringify(user)); renderAuth(); }
function clearAuth() { localStorage.removeItem('ht_sid'); localStorage.removeItem('ht_user'); renderAuth(); }

async function api(action, opts) {
    opts = opts || {};
    const headers = { 'Content-Type': 'application/json' };
    if (getSid()) headers['X-Session'] = getSid();
    const res = await fetch(API + '?action=' + action, {
        method: opts.method || 'GET',
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    const text = await res.text();
    try { return JSON.parse(text); }
    catch (e) {
        // PHP error page — extract message for diagnostics
        const m = text.match(/<b>(Fatal error|Warning)<\/b>:.*?<b>([^<]+)<\/b>.*?<b>([^<]+)<\/b>/s);
        return { status: 'error', code: 'api_error', detail: m ? (m[1] + ': ' + m[2] + ' @ ' + m[3]) : text.slice(0, 200) };
    }
}

/* ---------- library UI ---------- */
let SONGS = [];
let EDITING = null; // song object being edited

function roleCanEdit(user) { return user && (user.role === 'editor' || user.role === 'admin'); }

async function loadLibrary() {
    const r = await api('list');
    if (r.status !== 'ok') { $('library-error').textContent = 'Knihovnu nelze načíst: ' + (r.code || '?'); return; }
    SONGS = r.songs || [];
    renderLibrary();
}

function renderLibrary() {
    const q = ($('lib-search').value || '').toLowerCase();
    const user = getUser();
    const rows = SONGS.filter(s =>
        !q || s.title.toLowerCase().includes(q) || (s.author || '').toLowerCase().includes(q) || (s.the_key || '').toLowerCase().includes(q)
    );
    $('library-rows').innerHTML = rows.map(s => {
        const mine = user && s.author === user.username;
        const canEdit = (mine && roleCanEdit(user)) || (user && user.role === 'admin');
        const stars = s.rating_avg === null ? '—' : '★'.repeat(Math.round(s.rating_avg)) + '☆'.repeat(5 - Math.round(s.rating_avg));
        return `<tr data-id="${s.id}">
            <td><a href="#" onclick="openSong(${s.id});return false;"><b></b></a></td>
            <td>${s.the_key}</td>
            <td>${s.author}</td>
            <td>${stars} <small>(${s.rating_count})</small></td>
            <td class="actions">
                ${canEdit ? `<button class="mini" onclick="editSong(${s.id})">✏️</button>
                <button class="mini" onclick="deleteSong(${s.id})">🗑️</button>` : ''}
                <button class="mini" title="Kopírovat k sobě" onclick="forkSong(${s.id})">📄</button>
            </td>
        </tr>`.replace('<b></b>', '<b>' + esc(s.title) + '</b>');
    }).join('');
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

async function openSong(id) {
    const r = await api('get&id=' + id);
    if (r.status !== 'ok') { alert('Píseň nelze načíst: ' + (r.code || '?')); return; }
    const s = r.song;
    $('input').value = s.data || '';
    $('key').value = s.the_key || 'F';
    $('key').dispatchEvent(new Event('change'));
    document.getElementById('editor').scrollIntoView({ behavior: 'smooth' });
    EDITING = s;
    $('save-status').textContent = 'Editace: ' + s.title + ' (v' + s.version + ')';
}

async function editSong(id) { openSong(id); }

async function deleteSong(id) {
    if (!confirm('Smazat píseň?')) return;
    const r = await api('delete', { method: 'POST', body: { id } });
    if (r.status !== 'ok') { alert('Smazání selhalo: ' + (r.code || '?')); return; }
    await loadLibrary();
}

async function forkSong(id) {
    if (!roleCanEdit(getUser())) { alert('Kopírovat k sobě může jen editor.'); return; }
    const r = await api('fork', { method: 'POST', body: { id } });
    if (r.status !== 'ok') { alert('Kopírování selhalo: ' + (r.code || '?')); return; }
    await loadLibrary();
    openSong(r.id);
}

/* ---------- save song (create/update) ---------- */
async function saveSong() {
    const user = getUser();
    if (!roleCanEdit(user)) {
        // pro čtenáře: nabídnout kopii? ne — čtenář neukládá
        alert('Ukládat mohou jen editoři. Napiš adminovi, ať ti dá roli Editor.');
        return;
    }
    const title = EDITING ? EDITING.title : ($('song-title').value.trim() || 'Bez názvu');
    const payload = { title, key: $('key').value, data: $('input').value };
    let r;
    if (EDITING) {
        payload.id = EDITING.id;
        r = await api('update', { method: 'POST', body: payload });
    } else {
        r = await api('create', { method: 'POST', body: payload });
    }
    if (r.status !== 'ok') { alert('Uložení selhalo: ' + (r.code || '?')); return; }
    $('save-status').textContent = 'Uloženo ✓ (v' + (r.version || 1) + ')';
    EDITING = null;
    await loadLibrary();
}

/* ---------- rating ---------- */
async function rateSong(id, stars) {
    if (!getUser()) { alert('Hodnotit mohou jen přihlášení.'); return; }
    const r = await api('rate', { method: 'POST', body: { id, stars } });
    if (r.status !== 'ok') { alert('Hodnocení selhalo: ' + (r.code || '?')); return; }
    await loadLibrary();
}

/* ---------- auth UI ---------- */
async function doLogin() {
    const u = $('login-user').value.trim();
    const p = $('login-pass').value;
    const r = await api('login', { method: 'POST', body: { username: u, password: p } });
    if (r.status !== 'ok') { $('login-msg').textContent = 'Přihlášení selhalo: ' + (r.code || '?'); return; }
    if (r.pending) { $('login-msg').textContent = 'Registrace čeká na schválení adminem.'; return; }
    setAuth(r.sid, r.user);
    $('login-msg').textContent = '';
}
async function doRegister() {
    const u = $('login-user').value.trim();
    const p = $('login-pass').value;
    const r = await api('register', { method: 'POST', body: { username: u, password: p } });
    if (r.status !== 'ok') { $('login-msg').textContent = 'Registrace selhala: ' + (r.code === 'user_exists' ? 'uživatel už existuje' : (r.code || '?')); return; }
    $('login-msg').textContent = r.pending ? 'Zaregistrováno — čeká na schválení admina.' : 'Zaregistrováno a přihlášeno (admin).';
    if (r.role === 'admin') { await doLogin(); }
}
function doLogout() { api('logout', { method: 'POST' }); clearAuth(); }

function renderAuth() {
    const user = getUser();
    $('auth-box').innerHTML = user
        ? `<div class="authline">👤 <b>${esc(user.username)}</b> (${esc(user.role)}) <button class="mini" onclick="doLogout()">Odhlásit</button></div>`
        : `<div class="authline">
             <input id="login-user" placeholder="jméno" size="10">
             <input id="login-pass" type="password" placeholder="heslo" size="10">
             <button class="mini" onclick="doLogin()">Přihlásit</button>
             <button class="mini" onclick="doRegister()">Registrovat</button>
           </div><div id="login-msg" class="hint"></div>`;
    // re-bind enter key
    const lu = $('login-user'), lp = $('login-pass');
    if (lu) { lu.onkeydown = e => { if (e.key === 'Enter') doLogin(); }; lp.onkeydown = e => { if (e.key === 'Enter') doLogin(); }; }
}

/* ---------- admin panel ---------- */
async function renderAdmin() {
    const user = getUser();
    const box = $('admin-box');
    if (!user || user.role !== 'admin') { box.innerHTML = ''; return; }
    let html = '<h3>🛠️ Admin panel</h3>';
    // pending approvals
    const pend = await api('admin_pending');
    html += '<h4>Čeká na schválení</h4>';
    if (pend.status === 'ok' && (pend.users || []).length) {
        html += pend.users.map(u => `<div class="authline">${esc(u.username)}
            <button class="mini" onclick="approveUser(${u.id}, 'reader')">Čtenář</button>
            <button class="mini" onclick="approveUser(${u.id}, 'editor')">Editor</button>
        </div>`).join('');
    } else { html += '<div class="hint">Nikdo nečeká.</div>'; }
    // all users
    const all = await api('admin_users_all');
    html += '<h4>Všichni uživatelé</h4>' + '<table class="admintable"><tr><th>Jméno</th><th>Role</th><th>Stav</th><th>Akce</th></tr>' +
        (all.users || []).map(u => `<tr>
            <td>${esc(u.username)}</td>
            <td><select onchange="setRole(${u.id}, this.value)">
                ${['reader','editor','admin'].map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select></td>
            <td>${(+u.approved) ? '✓ schválen' : '⏳ čeká'}</td>
            <td class="nowrap">
                ${(+u.approved) ? `<button class="mini" onclick="disapproveUser(${u.id})">Zablokovat</button>` : ''}
                <button class="mini" onclick="resetUserPassword(${u.id})">Nové heslo</button>
                ${u.id !== user.id ? `<button class="mini" onclick="deleteUser(${u.id}, '${esc(u.username)}')">🗑️</button>` : ''}
            </td>
        </tr>`).join('') + '</table>';
    // library management (delete any song)
    html += '<h4>Správa písní</h4><div class="hint">Mazání libovolné písně: použij 🗑️ v tabulce knihovny (jako admin máš právo všude).</div>';
    box.innerHTML = html;
}
async function approveUser(id, role) {
    const r = await api('admin_approve', { method: 'POST', body: { id, role } });
    if (r.status !== 'ok') { alert('Schválení selhalo: ' + (r.code || '?')); return; }
    renderAdmin();
}
async function setRole(id, role) {
    const r = await api('admin_set_role', { method: 'POST', body: { id, role } });
    if (r.status !== 'ok') { alert('Změna role selhala: ' + (r.code || '?')); }
    renderAdmin();
}
async function disapproveUser(id) {
    if (!confirm('Zablokovat uživatele?')) return;
    const r = await api('admin_disapprove', { method: 'POST', body: { id } });
    if (r.status !== 'ok') { alert('Selhalo: ' + (r.code || '?')); }
    renderAdmin();
}
async function resetUserPassword(id) {
    const np = prompt('Nové heslo pro uživatele (min. 6 znaků):');
    if (!np || np.length < 6) return;
    const r = await api('admin_reset_password', { method: 'POST', body: { id, password: np } });
    alert(r.status === 'ok' ? 'Heslo změněno.' : 'Selhalo: ' + (r.code || '?'));
}
async function deleteUser(id, name) {
    if (!confirm('SMAZAT uživatele ' + name + '? Jeho písně zůstou (autor se zanuluje).')) return;
    const r = await api('admin_delete_user', { method: 'POST', body: { id } });
    if (r.status !== 'ok') { alert('Smazání selhalo: ' + (r.code || '?')); return; }
    renderAdmin(); loadLibrary();
}
/* ---------- init hooks ---------- */
window.addEventListener('DOMContentLoaded', () => {
    renderAuth();
    loadLibrary().then(renderAdmin);
    $('lib-search').addEventListener('input', renderLibrary);
    $('save-song').addEventListener('click', saveSong);
    $('new-song').addEventListener('click', () => { EDITING = null; $('input').value = ''; $('song-title').value = ''; $('save-status').textContent = 'Nová píseň'; $('key').value = 'F'; });
    // rating stars per row (event delegation)
    $('library-rows').addEventListener('click', (e) => {
        if (e.target.classList.contains('star')) {
            const tr = e.target.closest('tr');
            rateSong(+tr.dataset.id, +e.target.dataset.stars);
        }
    });
});