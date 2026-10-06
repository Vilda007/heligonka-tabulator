/* Heligonka Tabulator — app.js
   Parser textového formátu a renderer tabulatury ve stylu zpěvníkových tabulek. */

/* ---------- FORMÁT ----------
   title: Na Pankráci        (nepovinné, pak "Bez názvu")
   key: F                    (tónina — pro návrh basů)
   Vstup melodie = řádky taktove řady; systémy odděleny řádkem začínajícím "=".
   Nota: [II: nebo I:]číslo[/skluz][-][-|-|…][;BAS][~] (viz README)
   Příklady:
     II:6/5;F        — II. řada tl. 6, skluz na 5, bas F (tlačící)
     II:5;f          — tl. 5, bas f (tažný)
     I:8;f~          — I. řada tl. 8, skluzovka na další notu
     -;C             — hold/pauza, bas C
     >>;B            — skluz doprava (vlnovka do dalšího sloupce)
     <<;c            — skluz doleva
   Sloky: v1: text s | = oddělovač veršů.
-------------------------------------- */

const $ = (id) => document.getElementById(id);

const DEFAULT_SONG = `title: Na Pankráci
key: F
II:5;F II:6;f II:5;c II:4/5;F -|-|-;f II:5;f II:5;f II:5;F II:7/6;f II:6;f II:6;C I:9/8;B I:8;b -;b II:5;F II:6;f II:5;c
v1: Na Pank-krác-ci, na ma-lém ko-pec-ku, sto-jí pék-|
v1: né, stra-mo-fa-dí, mé-li sem ho-|
I:8/7;C I:7;c -;c I:9/8;C -;c II:5;F II:4/5;f II:5;F II:5;f II:5;C II:6;f II:5;C
v1: du, ku-na-mlu-ve-nou, a-le-ji-ny-mi za-ní cho-|

v2: Vy mládenci, co po noci, nelylte doopravdy,
po-mluvte pošpá suití.`;`

/* ----- ukázka přesnějšího zápisu: viz songs/na-pankraci.txt ----- */

function parseSong(text) {
  const song = { title: 'Bez názvu', key: 'F', beats: [], lyrics: [] };
  let currentBeat = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    let m;
    if ((m = line.match(/^title\s*:\s*(.+)$/i))) { song.title = m[1].trim(); continue; }
    if ((m = line.match(/^key\s*:\s*(.+)$/i)))   { song.key   = m[1].trim().toUpperCase(); continue; }
    if ((m = line.match(/^v\s*(\d+)\s*:\s*(.+)$/i))) {
      song.lyrics.push({ verse: +m[1], text: m[2].trim().split(/\s*\|\s*/) });
      continue;
    }
    if (line.startsWith('=')) { // nový systém
      if (currentBeat) song.beats.push(currentBeat), (currentBeat = null);
      continue;
    }
    // taktová řada: noty oddělené mezerou
    if (!currentBeat) currentBeat = [];
    for (const tok of line.split(/\s+/)) {
      currentBeat.push(parseNote(tok));
    }
  }
  if (currentBeat) song.beats.push(currentBeat);
  return song;
}

/* nota: II:6/5;F~ → { row:'II', num:'6', glide:'5', bas:'F', tie:true } */
function parseNote(tok) {
  const note = { row: null, num: '', glide: '', bas: '', tie: false, hold: false, slide: null };
  let s = tok;
  if (s.startsWith('<') && s.includes('<')) { note.slide = 'left'; s = s.replace(/<<*/, ''); }
  if (s.includes('>>'))                     { note.slide = 'right'; s = s.replace(/>>*/, ''); }
  const parts = s.split(';');
  if (parts.length > 1) note.bas = parts[1].replace(/~/, '') || '';
  if (s.includes('~')) note.tie = true;
  const head = parts[0] || '';
  if (head === '-' || head.includes('-')) note.hold = true;
  const rm = head.match(/^(II|I):(.+)$/);
  if (rm) {
    note.row = rm[1];
    const nums = rm[2].split('/');
    note.num = nums[0];
    note.glide = nums[1] || '';
  } else if (head && head !== '-') {
    note.num = head;
  }
  return note;
}

/* ===== Návrh basů (primitivní harmonie I-IV-V dle zadané tóniny) ===== */
const BAS = {
  // tónina → [tonic-tlačící, tonic-tažný, subdominant t/taž, dominant t/taž]
  'F':  { push:['F','B','C'],  pull:['f','b','c'] },
  'C':  { push:['C'],          pull:['c'] },
  'G':  { push:['G'],          pull:['g'] },
  'A':  { push:['A'],          pull:['a'] },
};
function suggestBass(key, degreeStep) {
  const k = BAS[key] || BAS['F'];
  return degreeStep % 2 === 0 ? k.push[degreeStep % k.push.length] : k.pull[degreeStep % k.pull.length];
}

/* ===== Renderer ===== */
function renderBeats(song) {
  const out = $('output');
  out.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'sheet-inner';

  // záhlaví
  const hdr = document.createElement('h3');
  hdr.className = 'song-title';
  hdr.textContent = song.title;
  wrap.appendChild(hdr);

  let sysEl = null, sysCells = null;
  const MAX_COLS = 8;

  const newSystem = () => {
    sysEl = document.createElement('div');
    sysEl.className = 'system';
    sysEl.innerHTML = gridHeaderHTML();
    sysCells = sysEl.querySelector('.cells');
    wrap.appendChild(sysEl);
  };
  const headerDone = new Set();

  function gridHeaderHTML() {
    return '<div class="grid">' +
      '<div class="rowlab">II.</div><div class="rowlab">I.</div><div class="rowlab">B</div><div class="rowlab">M</div>' +
      '</div><div class="cells"></div>';
  }

  newSystem();

  song.beats.forEach((beat, bi) => {
    beat.forEach((note, ni) => {
      if (sysCells.children.length >= MAX_COLS) newSystem();
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.appendChild(rowDiv(note.row === 'II' ? 'II' : 'II', note));
      cell.appendChild(rowDiv('I', note));
      cell.appendChild(rowDiv('B', note));
      cell.appendChild(rowDiv('M', note));
      if (note.tie) cell.classList.add('tie');
      if (note.slide) cell.classList.add('slide-' + note.slide);
      sysCells.appendChild(cell);
    });
  });

  // slohy
  song.lyrics.forEach((v) => {
    const p = document.createElement('p');
    p.className = 'verse';
    p.textContent = `[${v.text.join(' ')}]`;
    wrap.appendChild(p);
  });
  out.appendChild(wrap);
}

function rowDiv(row, note) {
  const d = document.createElement('div');
  d.className = 'r' + row;
  if (row === 'II') d.textContent = (note.row === 'II') ? (note.glide ? note.num + '\n' + note.glide : note.num) : (note.hold ? '–' : '');
  else if (row === 'I') d.textContent = (note.row !== 'II') ? (note.glide ? note.num + '\n' + note.glide : note.num) : (note.hold ? '–' : '');
  else if (row === 'B') d.textContent = note.bas || '';
  else d.textContent = note.slide === 'right' ? '→' : note.slide === 'left' ? '←' : '';
  return d;
}

/* ===== UI ===== */
$('render').addEventListener('click', () => {
  const song = parseSong($('input').value);
  renderBeats(song);
});

$('copy-html').addEventListener('click', () => {
  const html = $('output').innerHTML;
  navigator.clipboard.writeText(html).then(() => alert('HTML tabulatury zkopírováno.'));
});

// init
$('input').value = DEFAULT_SONG.replace(/`\s*;`$/, '');
$('render').click();