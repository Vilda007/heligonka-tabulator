/* Heligonka Tabulator v2 — app.js
   Parser textového formátu, tóninový selektor s transpozicí, ukázková píseň,
  ABC import (základ). $ helper je v shared.js. */

/* ================= TÓNINY A TRANSPOZICE =================
   Heligonka 2řadá: hraje se v tónině dle ladění (klasika C/F).
   Noty ukládáme jako stupňové číslo (1=tonika .. 7) + oktáva flag,
   tlačítka se řeší per-tónina mapou. Absolute-button songs (native key)
   se transponují: buttony -> stupně (inverse mapa native key) -> buttony (cílová key).
*/

/* Mapa stupně → {row, num} pro heligonku C/F (řada II = pull strana, I = push).
   Zdroj: standardní prstoklad 2řadé heligonky (zjednodušeně, diatonika C dur na D řadě / F dur na G řadě).
   Degree 8..13 = vyšší oktáva. */
const KEYMAPS = {
  F: { 1:{r:'II',n:'5'}, 2:{r:'II',n:'6'}, 3:{r:'II',n:'7'}, 4:{r:'I', n:'8'}, 5:{r:'II',n:'9'}, 6:{r:'I',n:'10'}, 7:{r:'II',n:'11'},
       8:{r:'II',n:'12'} },
  C: { 1:{r:'I', n:'1'}, 2:{r:'II',n:'2'}, 3:{r:'I', n:'3'}, 4:{r:'II',n:'4'}, 5:{r:'I', n:'5'}, 6:{r:'II',n:'6'}, 7:{r:'I', n:'7'},
       8:{r:'I', n:'8'} },
};
const SCALES = ['F','C','G','A','D','Bb'];
function scaleIndex(k){ const i=SCALES.indexOf(k); return i<0?0:i; }

/* transpozice stupně o N stupňů (within scale, oktáva wrap) */
function transposeDegree(deg, steps){ let d = ((deg-1+steps) % 7) + 1; return d; }

/* absolute button (row,num) in native key -> degree */
function buttonToDegree(map, row, num){
  for (const d in map){ if (map[d].r===row && map[d].n===String(num)) return +d; }
  return null;
}
function degreeToButton(key, deg){
  const map = KEYMAPS[key] || KEYMAPS.F;
  if (map[deg]) return {...map[deg]};
  // mimo rozsah mapy: wrap po oktávě (deg-7)
  if (map[deg-7]) return {...map[deg-7]};
  return {r:'II', n:'5'};
}
function transposeNote(note, fromKey, toKey){
  const fromMap = KEYMAPS[fromKey] || KEYMAPS.F;
  const deg = buttonToDegree(fromMap, note.row, note.num);
  if (deg == null) return note; // neznámé tl. — nechme
  const steps = scaleIndex(toKey) - scaleIndex(fromKey);
  const nd = transposeDegree(deg, steps);
  const btn = degreeToButton(toKey, nd);
  return { ...note, row: btn.r, num: btn.n, glide: note.glide, bas: transposeBass(note.bas, fromKey, toKey) };
}
/* basy: F/B/C atd. per tóninový kruh o stejný posun */
const BASS_ORDER = ['F','b','c','C','f','B','g','G','a','A','d','D'];
function transposeBass(bas, fromKey, toKey){
  if (!bas || bas==='~' || bas==='-') return bas;
  const steps = scaleIndex(toKey) - scaleIndex(fromKey);
  const i = BASS_ORDER.indexOf(bas);
  if (i < 0) return bas;
  return BASS_ORDER[(i + steps*2 + BASS_ORDER.length*4) % BASS_ORDER.length];
}

/* basy dle harmonie: stupně 1,4,5 → tonic/subdom/dominant push/pull dle melod. směru */
const KEY_BASS = {
  F:{I:['F','f'],IV:['B','b'],V:['C','c']},
  C:{I:['C','c'],IV:['F','f'],V:['G','g']},
  G:{I:['G','g'],IV:['C','c'],V:['D','d']},
  A:{I:['A','a'],IV:['D','d'],V:['E','e']},
  D:{I:['D','d'],IV:['G','g'],V:['A','a']},
  Bb:{I:['B','b'],IV:['E','e'],V:['F','f']},
};
function autoBass(key, deg, prevBas){
  const kb = KEY_BASS[key] || KEY_BASS.F;
  const pick = (pair, lastCase) => {
    // push/pull podle případu předchozího basu (zjednodušeně střídat)
    const wantUpper = lastCase === lastCase.toUpperCase() && lastCase !== lastCase.toLowerCase();
    return wantUpper ? pair[0] : pair[1];
  };
  let pair = kb.I;
  if (deg === 4) pair = kb.IV; else if (deg === 5) pair = kb.V; else if (deg === 1) pair = kb.I;
  return pick(pair, prevBas || 'F');
}

/* ================= PARSER ================= */
function parseSong(text){
  const song = { title:'Bez názvu', key:'F', beats:[], lyrics:[], abc:null };
  for (const raw of text.split(/\r?\n/)){
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    let m;
    if ((m = line.match(/^title\s*:\s*(.+)$/i))){ song.title=m[1].trim(); continue; }
    if ((m = line.match(/^key\s*:\s*(.+)$/i))){ song.key=m[1].trim().toUpperCase(); continue; }
    if ((m = line.match(/^abc\s*:\s*(.+)$/i))){ song.abc=m[1].trim(); continue; }
    if ((m = line.match(/^v\s*(\d+)\s*:\s*(.+)$/i))){ song.lyrics.push({verse:+m[1], text:m[2].split(/\s*\|\s*/)}); continue; }
    song.beats.push(line.split(/\s+/).map(parseNote));
  }
  return song;
}
/* nota: II:6/5;F~ | I:8;f | -;C | >>;B | <;~ skluzovka — a směr měchu: >II:5 = Tlak (→), <II:6 = Tah (←) */
function parseNote(tok){
  const n = { row:'II', num:'', glide:'', bas:'', tie:false, hold:false, slide:null, dir:null };
  let s = tok;
  if (s.startsWith('>>')){ n.slide='right'; s=s.slice(2); }
  else if (s.startsWith('<<')){ n.slide='left'; s=s.slice(2); }
  else if (s.startsWith('>')){ n.dir='push'; s=s.slice(1); }
  else if (s.startsWith('<')){ n.dir='pull'; s=s.slice(1); }
  const semi = s.indexOf(';');
  if (semi >= 0){
    n.bas = s.slice(semi+1);
    const head = s.slice(0, semi);
    if (head.endsWith('~')){ n.tie = true; n.num0 = head.slice(0,-1); }
    parseHead(n, head.replace(/~$/,''));
  } else {
    if (s.endsWith('~')){ n.tie = true; s = s.slice(0,-1); }
    parseHead(n, s);
  }
  return n;
}
function parseHead(n, head){
  if (head === '-' || head === ''){ n.hold = true; return; }
  const m = head.match(/^(II|I):(.+)$/);
  if (m){ n.row = m[1]; const g = m[2].split('/'); n.num = g[0]; n.glide = g[1]||''; }
  else { n.num = head; }
}

/* ================= ABC IMPORT (základní) =================
   Podporujeme "abc:" jednořádkový zápis: K:G | C D E F | G2 A2 ...
   Noty abcd → transponujeme do stupňů dle tóniny → buttony. */
const ABC_SEMIS = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const ABC_OFFSET = {C:0,D:1,E:2,F:3,G:4,A:5,B:6}; /* pozice ve stupnici C dur */
function abcToBeats(abcStr, key){
  const scaleSemis = [0,2,4,5,7,9,11];
  const fromKeySemi = ABC_SEMIS[key[0]] ?? 0;
  const out = [];
  const tokens = abcStr.split(/\s*\|\s*/).filter(t=>t.trim());
  for (const bar of tokens){
    const beatLine = [];
    const notes = bar.trim().match(/[A-Ga-gz][',]*\d?/g) || [];
    for (const tok of notes){
      if (tok === 'z'){ beatLine.push(parseNote('-;~')); continue; }
      const up = tok[0].toUpperCase();
      let semi = ABC_SEMIS[up] - fromKeySemi;
      let oct = 0;
      if (/[']/.test(tok)) oct = 1;
      if (/[,]/.test(tok)) oct = -1;
      let deg = ((ABC_OFFSET[up] - (ABC_OFFSET[key[0]] ?? 0)) % 7 + 7) % 7 + 1;
      const head = deg + (oct>0 ? '+8' : oct<0 ? '' : '');
      beatLine.push({row:'ABSD', num:String(deg), deg, oct, bas:'', tie:false, hold:false, glide:'', slide:null});
    }
    if (beatLine.length) out.push(beatLine);
  }
  return out;
}

/* ================= UKÁZKY ================= */
const SAMPLE_NA_PANKRACI = `title: Na Pankráci
key: F
II:5;F II:6;f II:5;c II:4/5~;F -;f II:5;f II:5;f II:5;F II:7/6;f II:6;f II:6;C I:9/8;B I:8;b -;b II:5;F II:6;f II:5;c
v1: Na Pank-krá-ci | na ma-lém ko-peč-ku | sto-jí pěk-né | stra-mo-řa-dí | měl jsem ho-`;

const SAMPLE_MILUJKU = `title:Miluj mě
key: C
I:1;C I:2;f I:3;C I:4;f I:5;C I:4;f I:3;C I:2;f
v1: Mi-luj mě | mi-luj mě | mo-je mi-lá`;

const SAMPLE_ABC = `title: Ukázka z ABC (Melodie v C)
key: C
abc: C D E F | G A B c | c B A G | F E D C
v1: Vy-stou-pá-me | až na-ho-ru | pak klesá-me | do-lů zno-vu`;

/* ================= RENDER ================= */
function renderBeats(song){
  const out = $('output');
  out.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className='sheet-inner';
  const hdr = document.createElement('h3'); hdr.className='song-title'; hdr.textContent = song.title + ((song.key)?'  ('+song.key+' dur)':'');
  wrap.appendChild(hdr);

  let sysEl=null, sysCells=null; const MAX_COLS=8;
  /* slabiky textu: sloky 1..N spoj, rozděl na slova (slabiky) — přiřazují se postupně notám */
  const verses = {};
  song.lyrics.forEach(v=>{ (verses[v.verse] = verses[v.verse] || []).push(...v.text); });
  const syl = [];
  Object.keys(verses).sort().forEach(vn=>{ verses[vn].forEach(ph => ph.split(/\s+/).filter(Boolean).forEach(w => syl.push(w))); });
  renderBeats._syl = syl;
  const newSystem=()=>{
    sysEl=document.createElement('div'); sysEl.className='system';
    sysEl.innerHTML=`<div class="labs"><div class="lab">II.</div><div class="lab">I.</div><div class="lab">B</div><div class="lab">M</div><div class="lab"></div></div><div class="cells"></div>`;
    sysCells=sysEl.querySelector('.cells'); wrap.appendChild(sysEl);
  };
  newSystem();

  let prevBas='';
  let noteCount = 0; // pozn. index pro přiřazení slabik textu
  /* předpočítat skupiny směru měchu: dlouhá šipka přes noty stejného směru (vzor) */
  const flatNotes = [];
  song.beats.forEach(b => b.forEach(n => flatNotes.push(n)));
  /* auto-odvození směru měchu z basu, pokud nota nemá explicitní dir:
     velké basy (F, C, B…) = Tlak (push), malé (f, c, b…) = Tah (pull) */
  let autoDir = null;
  flatNotes.forEach(n => {
    if (n.dir) { autoDir = n.dir; return; }
    if (n.bas && n.bas !== '~' && n.bas !== '-') {
      const isUpper = n.bas === n.bas.toUpperCase();
      autoDir = isUpper ? 'push' : 'pull';
    } else if (n.hold && n.bas && n.bas !== '~') {
      autoDir = n.bas === n.bas.toUpperCase() ? 'push' : 'pull';
    }
    if (autoDir) n.dir = autoDir;
  });
  let gi = -1, lastDir = null;
  flatNotes.forEach((n, i) => {
    const d = n.slide ? null : n.dir;
    if (d && d !== lastDir) { gi = i; lastDir = d; }
    if (d) {
      n._mGroup = gi; n._mDir = d;
    } else { n._mGroup = null; n._mDir = null; }
  });
  flatNotes.forEach((n, i) => {
    if (n._mGroup == null) return;
    const prev = flatNotes[i-1], next = flatNotes[i+1];
    n._mStart = !(prev && prev._mGroup === n._mGroup);
    n._mEnd = !(next && next._mGroup === n._mGroup);
  });
  song.beats.forEach((beat)=>{
    beat.forEach(note=>{
      if (sysCells.children.length >= MAX_COLS) newSystem();
      if (!note.bas && !note.hold){
        note.bas = autoBass(song.key, +note.num || 1, prevBas);
      }
      if (note.bas) prevBas = note.bas;
      const cell=document.createElement('div'); cell.className='cell';
      cell.appendChild(rowDiv('II', note));
      cell.appendChild(rowDiv('I', note));
      cell.appendChild(rowDiv('B', note));
      cell.appendChild(rowDiv('M', note));
      /* slabika pod dobou — jen u melodických not; basové filly text nesou */
      if (note.hold) cell.appendChild(syllableDiv(-1));
      else { cell.appendChild(syllableDiv(noteCount)); noteCount++; }
      if (note.tie) cell.classList.add('tie');
      if (note.slide) cell.classList.add('slide-'+note.slide);
      sysCells.appendChild(cell);
    });
  });
  /* poslední řádek tabulatury doplnit prázdnými sloupci na plný počet (vzor) */
  if (sysCells.children.length && sysCells.children.length < MAX_COLS) {
    while (sysCells.children.length < MAX_COLS) {
      const cell=document.createElement('div'); cell.className='cell empty';
      cell.appendChild(rowDiv('II', {}));
      cell.appendChild(rowDiv('I', {}));
      cell.appendChild(rowDiv('B', {}));
      cell.appendChild(rowDiv('M', {}));
      cell.appendChild(syllableDiv(-1));
      sysCells.appendChild(cell);
    }
  }

  /* sloka 1 = slabiky pod notami (výše); sloky 2+ zůstávají pod tabulaturou v závorce */
  Object.keys(verses).sort().forEach(vn=>{
    if (+vn <= 1) return;
    const p=document.createElement('p'); p.className='verse';
    p.textContent = `[${verses[vn].join(' ')}]`;
    wrap.appendChild(p);
  });
  out.appendChild(wrap);
}
function rowDiv(row, note){
  const d=document.createElement('div'); d.className='r'+row;
  const isRow = note.row === row;
  if (row==='II') d.textContent = isRow ? (note.glide ? note.num+'\n'+note.glide : (note.hold?'–':note.num)) : (note.hold?'–':'');
  else if (row==='I') d.textContent = isRow ? (note.glide ? note.num+'\n'+note.glide : (note.hold?'–':note.num)) : (note.hold?'–':'');
  else if (row==='B') d.textContent = note.bas || '';
  else {
    /* M řádek: souvislá CSS šipka přes skupinu not (kreslí ji CSS čára, ne textový glyf) */
    if (note.slide === 'right') d.textContent = '→';
    else if (note.slide === 'left') d.textContent = '←';
    else if (note._mGroup != null) {
      d.classList.add('m-arrow');
      d.classList.add(note._mDir === 'push' ? 'm-push' : 'm-pull');
      if (note._mStart) d.classList.add('m-start');
      if (note._mEnd) d.classList.add('m-end');
    }
  }
  return d;
}
/* slabika textu pod dobou — bere postupně z renderBeats._syl */
function syllableDiv(i){
  const d=document.createElement('div'); d.className='rT';
  const syl = renderBeats._syl;
  if (syl && i < syl.length) d.textContent = syl[i];
  return d;
}

/* ================= PIPELINE ================= */
function currentSongAndKey(){
  const selKey = $('key').value;
  let song = parseSong($('input').value);
  /* piseň z knihovny: pokud data nemají title:, použij název z knihovny */
  if (typeof EDITING !== 'undefined' && EDITING && song.title === 'Bez názvu') song.title = EDITING.title;
  if (song.abc){
    /* ABC → stupně → reálné knoflíky (KEYMAPS) — dříve značka ABSD, kterou renderer ignoroval */
    const beats = abcToBeats(song.abc, song.key);
    song.beats = beats.map(beat => beat.map(n => {
      if (n.row !== 'ABSD') return n;
      let deg = n.deg + (n.oct > 0 ? 7 : 0);
      const btn = degreeToButton(song.key, deg);
      return { row: btn.r, num: btn.n, bas: '', tie: n.tie, hold: false, glide: '', slide: null };
    }));
  }
  // transpozice
  if (song.key !== selKey){
    song.beats = song.beats.map(beat => beat.map(n => transposeNote(n, song.key, selKey)));
    song.key = selKey;
  }
  return song;
}
function doRender(){ renderBeats(currentSongAndKey()); }

/* ================= UI ================= */
const KEY_INFO = {
  F:'F dur (klasika, 2řadá C/F — hraje se v F)',
  C:'C dur (kontra, hraje se v C)',
  G:'G dur (transpozice — tóniny mimo C/F vyžadují jiný lad na heligonce, mapy jsou orientační)',
  A:'A dur (orientační mapa)',
  D:'D dur (orientační mapa)',
  Bb:'B dur (orientační mapa)',
};
$('key').addEventListener('change', ()=>{
  $('keyinfo').textContent = KEY_INFO[$('key').value] || '';
  doRender();
});
$('render').addEventListener('click', doRender);
$('file').addEventListener('change', (e)=>{
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { $('input').value = r.result; doRender(); };
  r.readAsText(f);
});
$('copy-html').addEventListener('click', ()=>{
  navigator.clipboard.writeText($('output').innerHTML).then(()=>alert('HTML tabulatury zkopírováno.'));
});

// init — na první načtení (bez ?pisen=) otevři píseň #1 z knihovny
doRender();

/* deep-link ?pisen= (nebo píseň #1 při prvním načtení) — načti z knihovny do editoru */
window.addEventListener('DOMContentLoaded', async () => {
    const m = location.search.match(/pisen=(\d+)/);
    const id = m ? +m[1] : 1;
    const r = await api('get&id=' + id);
    if (r.status !== 'ok') { $('save-status').textContent = 'Píseň nelze načíst: ' + (r.code || '?'); return; }
    const s = r.song;
    const isAnon = !getUser();
    EDITING = isAnon ? null : s;
    $('input').value = s.data || '';
    if ($('key')) { $('key').value = s.the_key || 'F'; $('key').dispatchEvent(new Event('change')); }
    $('save-status').textContent = isAnon ? '' : ('Editace: ' + s.title + ' (v' + s.version + ')');
    if (!isAnon && typeof updateShareLinks === 'function') updateShareLinks(s);
});
/* export XLS + uložení (index) */
window.addEventListener('DOMContentLoaded', () => {
    const ex = $('export-xls');
    if (ex) { ex.addEventListener('click', () => {
        const song = parseSong($('input').value);
        const title = EDITING ? EDITING.title : (song.title !== 'Bez názvu' ? song.title : prompt('Název písně pro export:') || 'pisen');
        exportSongToXls(title, $('key').value, $('input').value);
    }); if (!getUser()) ex.style.display = 'none'; }
    const em = $('export-midi');
    if (em) { em.addEventListener('click', () => {
        const song = parseSong($('input').value);
        const title = EDITING ? EDITING.title : (song.title !== 'Bez názvu' ? song.title : prompt('Název písně pro export:') || 'pisen');
        exportSongToMidi(title, $('key').value, $('input').value);
    }); if (!getUser()) em.style.display = 'none'; }
    const sv = $('save-song');
    if (sv) { sv.addEventListener('click', saveSong); if (!getUser()) sv.style.display = 'none'; }
    /* nepřihlášení: žádný import souboru */
    const fi = $('file');
    if (fi && !getUser()) { fi.style.display = 'none'; fi.parentElement.style.display = 'none'; }
    const nw = $('new-song');
    if (nw) nw.addEventListener('click', () => { EDITING = null; $('input').value = ''; $('save-status').textContent = 'Nová píseň'; $('key').value = 'F'; });
});