/* Heligonka Tabulator — shared.js: API, session, horní menu (společné pro všechny stránky) */
const API = 'https://klepeto.kuzelovi.cz/heligonka/api.php';
const $ = (id) => document.getElementById(id);

/* ---------- session ---------- */
function getSid() { return localStorage.getItem('ht_sid') || ''; }
function getUser() { try { return JSON.parse(localStorage.getItem('ht_user') || 'null'); } catch (e) { return null; } }
function setAuth(sid, user) { localStorage.setItem('ht_sid', sid); localStorage.setItem('ht_user', JSON.stringify(user)); renderAuth(); }
function clearAuth() { localStorage.removeItem('ht_sid'); localStorage.removeItem('ht_user'); renderAuth(); }
function roleCanEdit(user) { return user && (user.role === 'editor' || user.role === 'admin'); }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

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
        const m = text.match(/<b>(Fatal error|Warning)<\/b>:.*?<b>([^<]+)<\/b>.*?<b>([^<]+)<\/b>/s);
        return { status: 'error', code: 'api_error', detail: m ? (m[1] + ': ' + m[2] + ' @ ' + m[3]) : text.slice(0, 200) };
    }
}

function getLayout() {
    /* "2;12;F" = řady;knoflíků na řadu;ladění — z profilu uživatele, fallback localStorage */
    try { return JSON.parse(localStorage.getItem('ht_layout') || 'null'); } catch (e) { return null; }
}
function setLayout(l) { localStorage.setItem('ht_layout', JSON.stringify(l)); }

/* ---------- horní menu ---------- */
const MENU = [
    { href: 'index.html',    id: 'menu-tab',  label: '🎹 Tabulátor', i18n: 'menu.tab' },
    { href: 'knihovna.html', id: 'menu-lib',  label: '📚 Knihovna', i18n: 'menu.lib' },
    { href: 'uzivatele.html', id: 'menu-usr',  label: '👥 Uživatelé', i18n: 'menu.usr', admin: true },
    { href: 'akordy.html',   id: 'menu-ak',   label: '🎼 Akordy', i18n: 'menu.ak' },
    { href: 'predloha.html', id: 'menu-print', label: '🖨️ Předloha', i18n: 'menu.pred' },
    { href: 'ucet.html',     id: 'menu-acc',  label: '👤 Můj účet', i18n: 'menu.acc' },
    { href: 'napoveda.html', id: 'menu-help', label: '❓ Nápověda', i18n: 'menu.help' }
];
function renderMenu() {
    const nav = document.getElementById('topmenu');
    if (!nav) return;
    const user = getUser();
    const cur = location.pathname.split('/').pop() || 'index.html';
    nav.innerHTML = MENU.map(m => {
        if (m.admin && (!user || user.role !== 'admin')) return '';
        if (m.auth && !user) return '';
        const active = cur === m.href ? ' class="active"' : '';
        const label = (typeof t === 'function' && I18N[m.i18n]) ? t(m.i18n) : m.label;
        return `<a href="${m.href}"${active}>${label}</a>`;
    }).join('') + '<span id="auth-mini" style="margin-left:auto;font-size:.85rem;"></span>';
    renderAuthMini();
    renderLangToggle(nav);
}
/* přepínač jazyka UI: obrázková vlajka cílového jazyka (CZ režim → 🇬🇧, EN režim → 🇨🇿) — Twemoji, Windows emoji nezná */
function renderLangToggle(nav) {
    if (!nav || typeof getUiLang !== 'function') return;
    const cur = getUiLang();
    const target = cur === 'CZ' ? 'EN' : 'CZ';
    const tw = { EN: '1f1ec-1f1f7', CZ: '1f1e8-1f1ff' };
    const img = tw[target];
    const title = cur === 'CZ' ? 'Switch to English' : 'Přepnout do češtiny';
    const btn = document.createElement('button');
    btn.className = 'mini lang-toggle';
    btn.title = title;
    btn.innerHTML = '<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/' + img + '.svg" alt="' + target + '" width="22" height="22" style="vertical-align:-6px">';
    btn.style.cssText = 'font-size:1rem;padding:.15em .35em;margin-left:.6rem;background:#f5ecd8;border:1px solid #b8a878;border-radius:4px;cursor:pointer;line-height:1';
    btn.addEventListener('click', async () => {
        setUiLang(target);
        const user = getUser();
        if (user) {
            try { await api('save_profile', { method: 'POST', body: { bio: user.bio || '', ui_lang: target, def_lang: user.def_lang || 'CZ' } }); user.ui_lang = target; localStorage.setItem('ht_user', JSON.stringify(user)); } catch (e) {}
        }
        location.reload();
    });
    nav.appendChild(btn);
}
function renderAuthMini() {
    const el = document.getElementById('auth-mini');
    if (!el) return;
    const user = getUser();
    const logoutLbl = (typeof t === 'function') ? t('menu.logout') : 'Odhlásit';
    const loginLbl = (typeof t === 'function') ? t('menu.login') : 'Přihlásit / registrovat';
    el.innerHTML = user
        ? `👤 <b>${esc(user.username)}</b> <span class="hint">(${esc(user.role)})</span> <button class="mini" onclick="doLogout()">${logoutLbl}</button>`
        : `<a href="ucet.html">${loginLbl}</a>`;
}

/* ---------- přihlášení (formulář na knihovně i uživatelích) ---------- */
async function doLogin() {
    const u = $('login-user').value.trim();
    const p = $('login-pass').value;
    const r = await api('login', { method: 'POST', body: { username: u, password: p } });
    if (r.status !== 'ok') { $('login-msg').textContent = 'Přihlášení selhalo: ' + (r.code || '?'); return; }
    if (r.pending) { $('login-msg').textContent = 'Registrace čeká na schválení adminem.'; return; }
    setAuth(r.sid, r.user);
    const lm = $('login-msg');
    if (lm) lm.textContent = '';
    location.reload();
}
async function doRegister() {
    const u = $('login-user').value.trim();
    const p = $('login-pass').value;
    const r = await api('register', { method: 'POST', body: { username: u, password: p } });
    if (r.status !== 'ok') { $('login-msg').textContent = 'Registrace selhala: ' + (r.code === 'user_exists' ? 'uživatel už existuje' : (r.code || '?')); return; }
    $('login-msg').textContent = r.pending ? 'Zaregistrováno — čeká na schválení admina.' : 'Zaregistrováno a přihlášeno (admin).';
    if (r.role === 'admin') { await doLogin(); }
}
function doLogout() { api('logout', { method: 'POST' }); clearAuth(); renderMenu(); location.reload(); }

/* ---------- obecné stránkování + řazení ----------
   state: { sortKey, sortDir: 1|-1, page: 0, perPage } */
function sortPage(items, state) {
    const arr = items.slice();
    if (state.sortKey) {
        arr.sort((a, b) => {
            let x = a[state.sortKey], y = b[state.sortKey];
            if (typeof x === 'string') { x = x.toLowerCase(); y = (y + '').toLowerCase(); }
            if (x === null || x === undefined) return 1;
            if (y === null || y === undefined) return -1;
            return (x < y ? -1 : x > y ? 1 : 0) * state.sortDir;
        });
    }
    const start = state.page * state.perPage;
    return arr.slice(start, start + state.perPage);
}
/* vykreslí hlavičku sortovatelné tabulky; cols = [{key,label,align?}] */
function sortHeader(cols, state) {
    return '<tr>' + cols.map(c => {
        const active = state.sortKey === c.key;
        const arrow = active ? (state.sortDir === 1 ? ' ▲' : ' ▼') : '';
        return `<th data-sort="${c.key}" style="cursor:pointer;user-select:none" title="Klikni = řadit podle sloupce">${c.label}${arrow}</th>`;
    }).join('') + '</tr>';
}
/* pagination controls; total = počet položek */
function pagerHtml(total, state) {
    const pages = Math.max(1, Math.ceil(total / state.perPage));
    if (pages <= 1) return '';
    let btns = '';
    for (let i = 0; i < pages; i++) {
        btns += i === state.page
            ? `<b style="padding:.1em .5em">${i + 1}</b> `
            : `<a href="#" data-page="${i}" style="padding:.1em .5em">${i + 1}</a> `;
    }
    return `<div class="pager hint">Strana ${state.page + 1}/${pages}: ${btns}</div>`;
}
function wireSortPager(theadEl, containerEl, state, rerender) {
    theadEl.addEventListener('click', e => {
        const th = e.target.closest('th[data-sort]');
        if (!th) return;
        const k = th.dataset.sort;
        if (state.sortKey === k) state.sortDir = -state.sortDir; else { state.sortKey = k; state.sortDir = 1; }
        state.page = 0;
        rerender();
    });
    containerEl.addEventListener('click', e => {
        const a = e.target.closest('a[data-page]');
        if (!a) return;
        e.preventDefault();
        state.page = +a.dataset.page;
        rerender();
    });
}

window.addEventListener('DOMContentLoaded', () => {
    renderMenu();
    if (typeof applyI18n === 'function') applyI18n();
});