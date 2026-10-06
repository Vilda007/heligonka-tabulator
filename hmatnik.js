/* Heligonka Tabulator — hmatnik.js (v6)
   Klikací hmatník: grafický záznam melodie klikáním na knoflíky.
   - Grid 2 řad (II./I.) dle mapy aktuální tóniny + basová řada (B)
   - Klik na knoflík = připojí notu do editoru (textový formát) a překreslí tabulaturu
   - Přepínač směru měchu (Tlak → / Tah ←) prefixuje notu (>/‎<)
   - Klik na bas = připojí samostatnou basovou dobu (-;bas) */

const HMATNIK_NOTE_NAMES = { C:0, D:2, E:4, F:5, G:7, A:9, H:11 };
const HMATNIK_TONIC_PC = { F:5, C:0, G:7, A:9, D:2, Bb:10 };
const HMATNIK_PC_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

/* stupeň (1..14) → mezinárodní název noty dle tóniny */
function degToNoteName(deg, key) {
    const scaleSemi = [0,2,4,5,7,9,11];
    const d = ((deg - 1) % 7 + 7) % 7;
    const oct = Math.floor((deg - 1) / 7);
    const tonic = HMATNIK_TONIC_PC[key] ?? 5;
    const midi = 60 + (scaleSemi[d] - tonic + 12 * (oct - 1) + 120) % 12;
    return HMATNIK_PC_NAMES[midi % 12];
}

/* barvení knoflíků dle směru: tlačítko může hrát při Tlaku i Tahu — pro jednoduchost
   používáme směr z přepínače; název noty je stejný pro oba směry (diatonika) */

function hmatnikRows(key) {
    /* vrátí [{row:'II', buttons:[{num,deg,name}...]}, {row:'I', ...}] dle KEYMAPS */
    const map = (typeof KEYMAPS !== 'undefined') ? KEYMAPS[key] || KEYMAPS.F : null;
    if (!map) return [];
    const rows = { II: [], I: [] };
    for (const d in map) {
        const b = map[d];
        rows[b.r].push({ num: b.n, deg: +d, name: degToNoteName(+d, key) });
    }
    rows.II.sort((a, b) => (+a.num) - (+b.num));
    rows.I.sort((a, b) => (+a.num) - (+b.num));
    return [rows.II, rows.I].filter(r => r.length);
}

const HMATNIK_BASSES = ['F','f','B','b','C','c','G','g','E','e','A','a','D','d'];

function hmatnikToken(row, num, dir) {
    const p = dir === 'push' ? '>' : dir === 'pull' ? '<' : '';
    return p + row + ':' + num;
}

function renderHmatnik() {
    const box = document.getElementById('hmatnik-grid');
    if (!box) return;
    const keySel = document.getElementById('key');
    const key = keySel ? keySel.value : 'F';
    const dirSel = document.getElementById('hmatnik-dir');
    const dir = dirSel ? dirSel.value : '';
    let html = '';
    for (const row of hmatnikRows(key)) {
        html += '<div class="hm-row"><span class="hm-lab">' + (row === hmatnikRows(key)[0] ? 'II.' : 'I.') + '</span>';
        for (const b of row) {
            html += '<button class="hm-btn" data-row="' + (row === hmatnikRows(key)[0] ? 'II' : 'I') + '" data-num="' + b.num + '" title="Stupeň ' + b.deg + ' — tón ' + b.name + '">' +
                b.num + '<small>' + b.name + '</small></button>';
        }
        html += '</div>';
    }
    /* basy */
    html += '<div class="hm-row"><span class="hm-lab">B</span>';
    for (const bass of HMATNIK_BASSES) {
        const isPush = bass === bass.toUpperCase();
        html += '<button class="hm-btn hm-bass" data-bass="' + bass + '" title="Bas ' + (isPush ? 'Tlak' : 'Tah') + '">' + bass + '</button>';
    }
    html += '</div>';
    box.innerHTML = html;
    /* kliknutí na melodický knoflík */
    box.querySelectorAll('.hm-btn[data-row]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tok = hmatnikToken(btn.dataset.row, btn.dataset.num, dir);
            appendTokenToEditor(tok);
        });
    });
    /* kliknutí na bas */
    box.querySelectorAll('.hm-btn[data-bass]').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = btn.dataset.bass === btn.dataset.bass.toUpperCase() ? '>' : '<';
            appendTokenToEditor(p + '!-;' + btn.dataset.bass);
        });
    });
}

function appendTokenToEditor(tok) {
    const inp = document.getElementById('input');
    if (!inp) return;
    let v = inp.value;
    if (v && !v.endsWith('\n') && !tok.startsWith('v')) v += ' ';
    inp.value = v + tok + ' ';
    if (typeof doRender === 'function') doRender();
}

function wireHmatnik() {
    const tog = document.getElementById('toggle-hmatnik');
    const box = document.getElementById('hmatnik-box');
    if (!tog || !box) return;
    tog.addEventListener('click', () => {
        const shown = box.style.display !== 'none';
        box.style.display = shown ? 'none' : 'block';
        tog.classList.toggle('on', !shown);
        if (!shown) renderHmatnik();
    });
    const keySel = document.getElementById('key');
    if (keySel) keySel.addEventListener('change', () => { if (box.style.display !== 'none') renderHmatnik(); });
    const dirSel = document.getElementById('hmatnik-dir');
    if (dirSel) dirSel.addEventListener('change', () => { /* dir se čte při kliknutí */ });
}
window.addEventListener('DOMContentLoaded', wireHmatnik);