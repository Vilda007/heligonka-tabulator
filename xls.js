/* Heligonka Tabulator — XLS import (v5)
   Podporuje notovací XLS "deutsche Heligonka-Tabulatur" (vzor: 3Morava.xls):
   - list: sloupec A = slabika textu, sloupce B.. = hlasy v německé notaci
     (b=H/B dur, es=Eb, as=Ab, fis=Fis, cis=Cis; číslo 1..7 = stupeň nad tóninou,
     čárka "," za číslem = nižší oktáva, apostrofy = vyšší), sloupec "Tlak"/"Tah"
     = směr měchu, řádky se sloupcem A = "B" = basové tlačítko (b!:X, X! = název basu),
   - tónina odvozena z názvu listu ("B-Es-As" = 3 béčka = Bb) nebo ručně.
   Používá SheetJS (CDN unpkg) — staré .xls (BIFF/CFB) i .xlsx se parsují v prohlížeči.
   Výstup: textový formát apky (II:/I: + basy) → input pole. */

const XLSX_CDN = 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js';

function loadXlsxLib(cb) {
    if (window.XLSX) { cb(); return; }
    const s = document.createElement('script');
    s.src = XLSX_CDN;
    s.onload = cb;
    s.onerror = () => alert('Knihovnu XLSX nelze načíst (offline?).');
    document.head.appendChild(s);
}

/* ---- německá notace → (semitony od C, oktáva) ----
   "b" = H (11), "h" = H také (starší), "es" = Eb (3), "as" = Ab (8),
   "fis" = 6, "cis" = 1, "ges" = 6, "des" = 1, "b" může být i Bb (10) dle tóniny —
   v tomto XLS žádné Bb noty nejsou, "b" = tónika Bb listu znamená stupeň 1.
   Vzorec tokenu: <jméno tónu><volitelně číslo stupně 1-7><, nebo '>*  */
const GERMAN_PC = {
    'c': 0, 'cis': 1, 'des': 1, 'd': 2, 'es': 3, 'e': 4, 'f': 5,
    'fis': 6, 'ges': 6, 'g': 7, 'as': 8, 'a': 9, 'b': 10, 'bb': 10, 'h': 11
};
/* stupňová notace: jméno tónu tóniny + číslo stupně
   např. list "B-Es-As" (Bb dur): b=1, c=2, d=3, es=4, f=5, g=6, as=7 */
const DEGREE_BY_KEYFLAT = {
    3: { 'b': 1, 'c': 2, 'd': 3, 'es': 4, 'f': 5, 'g': 6, 'as': 7 }, // Bb dur
    2: { 'b': 2, 'c': 3, 'd': 4, 'es': 5, 'f': 6, 'g': 7, 'a': 1 },  // Bb dur transp.? fallback
    0: { 'c': 1, 'd': 2, 'e': 3, 'f': 4, 'g': 5, 'a': 6, 'h': 7 }    // C dur
};

/* key signature z názvu listu → tónina apky */
function keyFromSheetName(name) {
    if (/^A dur|^A\s*dur/.test(name)) return 'A';
    if (/^G dur|^G\s*dur/.test(name)) return 'G';
    if (/^F dur|^F\s*dur/.test(name)) return 'F';
    if (/^C dur|^C\s*dur/.test(name)) return 'C';
    if (/B-Es-As|B\s*-\s*Es\s*-\s*As/.test(name)) return 'Bb';
    const flats = (name.match(/Es|As|B(?![a-z])/g) || []).length;
    if (flats === 3) return 'Bb';
    if (flats === 1) return 'F';
    return null;
}

/* diatonické kroky nad C (v rámci jedné oktávy) — německá jména */
const GERMAN_STEPS = { c:0, cis:0, des:1, d:1, es:2, e:2, f:3, fis:3, ges:4, g:4, as:5, a:5, b:6, h:6 };

/* tónika dané tóniny — notové jméno v německé notaci (nodigit = malá oktáva) */
const KEY_TONIC_NAME = { Bb:'b', F:'f', C:'c', G:'g', A:'a', D:'d' };

/* parse jedné notové buňky → absolutní diatonický index (kroky nad C, oktávy po 7) */
function parseGermanNote(cell) {
    if (!cell) return null;
    const s = String(cell).trim().toLowerCase().replace(/,+$/, '');
    if (!s) return null;
    const m = s.match(/^([a-z]+)(\d)?('*)$/);
    if (!m) return null;
    const name = m[1];
    if (!(name in GERMAN_STEPS)) return null;
    /* číslice = oktávová linka (0 = malá, 1 = jednolinká, 2 = dvojlínková);
       čárka za číslem je univerzální přípona, apostrof = +1 oktáva */
    const digit = m[2] ? parseInt(m[2], 10) : 0;
    const apos = (m[3] || '').length;
    return { idx: GERMAN_STEPS[name] + 7 * (digit + apos), name };
}

/* německé basy → slovník apky (BASS_ORDER: F,b,c,C,f,B,g,G,a,A,d,D).
   Velké = Tlak (push), malé = Tah (pull). Es (Eb) = IV v Bb → 'E';
   As (Ab) nemá ekvivalent — nejbližší 'A' (orientačně). */
const BASS_PUSH = { 'B':'B','G':'G','C':'C','F':'F','D':'D','A':'A','Es':'E','As':'A' };
const BASS_PULL = { 'b':'b','g':'g','c':'c','f':'f','d':'d','a':'a','es':'e','as':'a' };
function germanBassToApp(name) {
    if (name in BASS_PUSH) return BASS_PUSH[name];
    if (name in BASS_PULL) return BASS_PULL[name];
    return null;
}

/* parse basové buňky: "Es!", "C!" = push (vykřičník/velké), "c," "es," = pull (bez !, malé). */
function parseBassCell(cell) {
    if (!cell) return null;
    const s = String(cell).trim().replace(/[,.;]+$/, '');
    if (!s) return null;
    const m = s.match(/^([A-Za-z]+)(!)?$/);
    if (!m) return null;
    const name = m[1];
    if (!(name in BASS_PUSH) && !(name in BASS_PULL)) return null;
    const push = !!m[2] || (name in BASS_PUSH);
    return { name, push };
}

/* sken basů v řádku — sloupce ≥ 10 (za Tlak/Tah a melodickými hlasy);
   pull-varianta (malé) téhož písmene, které už máme push, se ignoruje (alternativa). */
function scanRowBasses(r) {
    const found = [];
    const seen = {};
    for (let ci = 10; ci < r.length; ci++) {
        const v = (r[ci] || '').toString().trim();
        if (!v) continue;
        const b = parseBassCell(v);
        if (!b) continue;
        const letter = b.name.toLowerCase();
        if (seen[letter] && !b.push) continue;
        const app = germanBassToApp(b.name);
        if (!app) continue;
        seen[letter] = true;
        found.push(app);
    }
    return found;
}

/* ---- hlavní převod: worksheet → textový formát ----
   Řádky: A = slabika, B.. = hlasy v německé notaci (col B = melodie),
   sloupec "Tlak"/"Tah" = směr měchu, basy "X!" kdekoliv v řádku.
   Řádek bez noty, ale s basem („B“-řádek) = samostatná basová doba;
   bas na melodickém řádku se přilepí k dané notě. */
function xlsToSong(ws, sheetName) {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
    const key = keyFromSheetName(sheetName) || 'Bb';
    const tonicName = KEY_TONIC_NAME[key] || 'c';
    const tonicIdx = GERMAN_STEPS[tonicName] || 0;
    const beats = [];   // { text, idx, bass? } = melodická doba; { hold:true, bass } = samostatná basová doba
    const lyrics = [];
    for (let ri = 0; ri < rows.length; ri++) {
        const r = rows[ri] || [];
        const a = (r[0] || '').toString().trim();
        /* melodie = první notový sloupec (col 1), další sloupce jsou doprovodné hlasy */
        const mcell = (r[1] || '').toString().trim();
        const n = mcell ? parseGermanNote(mcell) : null;
        /* směr měchu: sloupec „Tlak"/„Tah" (index 8, fallback 7) */
        const dirRaw = ((r[8] || r[7] || '') + '').trim();
        const dir = dirRaw === 'Tlak' ? 'push' : dirRaw === 'Tah' ? 'pull' : null;
        /* sken basů ve sloupcích ≥ 10 (za Tlak/Tah) — push X! i pull x, dedup alternativ */
        const appBasses = scanRowBasses(r);
        if (n) {
            const beat = { text: a, idx: n.idx, bass: appBasses[0] || '', dir };
            beats.push(beat);
            if (a) lyrics.push(a);
            /* zbylé basy z řádku = samostatné doby (vzácne) */
            for (let bi = 1; bi < appBasses.length; bi++) beats.push({ hold: true, bass: appBasses[bi] });
        } else if (appBasses.length) {
            /* B-řádek = samostatné basové doby (instrumentální fill ve 3/4) */
            for (const ab of appBasses) beats.push({ hold: true, bass: ab, dir });
        } else if (a) {
            // text bez noty — přilep k předchozímu beatu
            if (beats.length) beats[beats.length - 1].text += ' ' + a;
        }
    }
    /* sestav textový formát — stupeň = idx - tónika + 1 */
    let out = 'key: ' + key + '\n';
    let line = [];
    for (let i = 0; i < beats.length; i++) {
        const b = beats[i];
        const tok = b.hold
            ? ((b.dir === 'push' ? '>' : b.dir === 'pull' ? '<' : '') + '!-;' + b.bass)
            : ((b.dir === 'push' ? '>' : b.dir === 'pull' ? '<' : '') + 'II:' + (b.idx - tonicIdx + 1) + (b.bass ? ';' + b.bass : ''));
        line.push(tok);
        if (line.length >= 8) { out += line.join(' ') + '\n'; line = []; }
    }
    if (line.length) out += line.join(' ') + '\n';
    if (lyrics.length) out += 'v1: ' + lyrics.join(' ') + '\n';
    return { text: out, key, title: '' };
}

/* ---- EXPORT: píseň → XLS (BIFF8, notace tabulek) ---- */
/* stupně 1..7 (a 8..14 vyšší oktáva) → německé názvy not dle tóniny */
const KEY_DEGREE_NAMES = {
    Bb: ['b','c','d','es','f','g','as'],
    F:  ['f','g','a','b','c','d','e'],
    C:  ['c','d','e','f','g','a','h'],
    G:  ['g','a','h','c','d','e','fis'],
    A:  ['a','h','cis','d','e','fis','gis'],
    D:  ['d','e','fis','g','a','h','cis']
};
function degToGermanNote(deg, key) {
    const names = KEY_DEGREE_NAMES[key] || KEY_DEGREE_NAMES.F;
    const d = ((deg - 1) % 7 + 7) % 7;
    const oct = Math.floor((deg - 1) / 7);
    return names[d] + (oct > 0 ? String(oct) : '');
}
/* bas apky → německý zápis (velké = "X!", malé = "x,") */
function appBassToGerman(b) {
    const big = { B:'B', G:'G', C:'C', F:'F', D:'D', A:'A', E:'Es', H:'H' };
    const small = { b:'es', g:'g', c:'c', f:'f', d:'d', a:'as', e:'es', h:'h' };
    if (big[b]) return big[b] + '!';
    if (small[b]) return small[b] + ',';
    return '';
}
/* export textového formátu → XLS (aoa), stáhne .xls */
function exportSongToXls(title, key, text) {
    loadXlsxLib(() => {
        try {
            const rows = [];
            const syl = [];
            let v1line = null;
            for (const raw of (text || '').split(/\r?\n/)) {
                const line = raw.trim();
                if (!line || /^(title|key|abc)\s*:/i.test(line)) continue;
                const m = line.match(/^v\s*1\s*:\s*(.+)$/i);
                if (m) { v1line = m[1]; continue; }
                for (const tok of line.split(/\s+/)) {
                    if (!tok) continue;
                    rows.push(tok);
                }
            }
            if (v1line) v1line.split(/\s*[|]\s*|\s+/).filter(Boolean).forEach(s => syl.push(s));
            const aoa = [];
            let si = 0;
            for (const tok of rows) {
                const semi = tok.indexOf(';');
                const head = semi >= 0 ? tok.slice(0, semi) : tok;
                const bass = semi >= 0 ? tok.slice(semi + 1) : '';
                const dir = bass ? (bass === bass.toUpperCase() ? 'Tlak' : 'Tah') : '';
                if (head === '-' || head === '' || /^>>|<</.test(head)) {
                    /* basová doba (fill) */
                    aoa.push(['B', '', '', '', '', '', '', '', dir, '', '', '', bass ? appBassToGerman(bass) : '']);
                } else {
                    const mdeg = head.match(/^(?:II|I):(\d+)(?:\/(\d+))?$/);
                    const deg = mdeg ? parseInt(mdeg[1], 10) : 1;
                    const glide = mdeg && mdeg[2] ? degToGermanNote(parseInt(mdeg[2], 10), key) + ',' : '';
                    const note = degToGermanNote(deg, key) + ',';
                    const syll = si < syl.length ? syl[si++] : '';
                    const r = [syll, note, glide, '', '', '', '', '', dir, '', '', '', bass ? appBassToGerman(bass) : ''];
                    aoa.push(r);
                }
            }
            const sheetName = key === 'Bb' ? 'B-Es-As' : (key + ' dur-C dur-F dur');
            const ws = XLSX.utils.aoa_to_sheet(aoa);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
            const buf = XLSX.write(wb, { bookType: 'biff8', type: 'array' });
            const blob = new Blob([buf], { type: 'application/vnd.ms-excel' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = (title || 'pisen').replace(/[\\/:*?"<>|]/g, '_') + '.xls';
            a.click();
            URL.revokeObjectURL(a.href);
        } catch (err) { alert('XLS export selhal: ' + err.message); }
    });
}

/* ---- upload wiring ---- */
function wireXls() {
    const inp = document.getElementById('file');
    if (!inp) return;
    const accept = inp.getAttribute('accept') || '';
    if (accept.indexOf('.xls') < 0) {
        inp.setAttribute('accept', accept.replace('text/plain', 'text/plain,.xls,.xlsx,application/vnd.ms-excel'));
    }
    inp.addEventListener('change', e => {
        const f = e.target.files[0];
        if (!f) return;
        const name = (f.name || '').toLowerCase();
        if (!name.endsWith('.xls') && !name.endsWith('.xlsx')) return; // ostatní řeší app.js/midi.js
        loadXlsxLib(() => {
            const r = new FileReader();
            r.onload = () => {
                try {
                    const wb = XLSX.read(r.result, { type: 'array' });
                    const sn = wb.SheetNames[0];
                    const ws = wb.Sheets[sn];
                    const song = xlsToSong(ws, sn);
                    const title = (f.name || 'Import').replace(/\.xlsx?$/i, '');
                    document.getElementById('input').value =
                        'title: ' + title + '\n' + song.text;
                    // tónina: přepneme selektor, pokud ji máme
                    const sel = document.getElementById('key');
                    if (sel && song.key) {
                        for (let i = 0; i < sel.options.length; i++) {
                            if (sel.options[i].value === song.key) { sel.selectedIndex = i; break; }
                        }
                        const ev = new Event('change');
                        sel.dispatchEvent(ev);
                    }
                    doRender();
                    alert('XLS rozpoznáno: list "' + sn + '", tónina ' + song.key + ' (dle názvu listu). ' +
                          'Noty jsou převedeny na stupně — zkontroluj a dolad ručně, pak ulož do knihovny.');
                } catch (err) {
                    alert('XLS parse selhal: ' + err.message);
                }
            };
            r.readAsArrayBuffer(f);
        });
    });
}
window.addEventListener('DOMContentLoaded', wireXls);