/* Heligonka Tabulator — MIDI import (v4)
   Používá @tonejs/midi (CDN unpkg) — parse MIDI v prohlížeči.
   Vstup: .mid soubor → hlavní melodický hlas + basy → textový formát → input pole. */

const MIDI_CDN = 'https://unpkg.com/@tonejs/midi@2.0.28/build/Midi.min.js';

function loadMidiLib(cb) {
    if (window.Midi) { cb(); return; }
    const s = document.createElement('script');
    s.src = MIDI_CDN;
    s.onload = cb;
    s.onerror = () => alert('Knihovnu MIDI nelze načíst (offline?).');
    document.head.appendChild(s);
}

/* Krumhansl-Schmuckler: detekce tóniny (major) od pitch-class histogramu */
const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const PITCH_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const PC_OF_KEYNAME = {C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};

function detectKey(notes) {
    const hist = new Array(12).fill(1e-6);
    notes.forEach(n => hist[n % 12] += n.dur || 1);
    let best = { key: 'F', score: -1 };
    for (let t = 0; t < 12; t++) {
        for (const [k, prof] of [['major', KS_MAJOR]]) {
            let sc = 0;
            for (let pc = 0; pc < 12; pc++) sc += hist[pc] * prof[(pc - t + 12) % 12];
            if (sc > best.score) best = { key: PITCH_NAMES[t], score: sc };
        }
    }
    // normalize: prefer Bb shape for 10
    if (best.key === 'A#') best.key = 'Bb';
    return best.key;
}

/* hlavní melodický hlas = střední výškový medián současných not; basy = spodní oktáva (midi < 55 = F2) */
function parseMidi(buffer) {
    const midi = new Midi(buffer);
    const mel = [], bass = [];
    midi.tracks.forEach(tr => {
        tr.notes.forEach(n => {
            const rec = { midi: n.midi, dur: n.duration, time: n.time };
            if (n.midi < 55) bass.push(rec); else mel.push(rec);
        });
    });
    mel.sort((a, b) => a.time - b.time);
    bass.sort((a, b) => a.time - b.time);
    return { mel, bass, header: midi.header };
}

/* melodie → textový formát (stupně dle cílové tóniny) */
function midiToText(mel, bass, targetKey) {
    // reference tóninky: tónika = PC_OF_KEYNAME[targetKey]
    const tonicPc = PC_OF_KEYNAME[normalizeKeyName(targetKey)] ?? 5;
    const scaleSemi = [0,2,4,5,7,9,11];
    // degree of midi note = (midi - tonicPcMidi) -> step in scale
    function midiToDegree(m) {
        const rel = ((m - tonicPc) % 12 + 12) % 12;
        const idx = scaleSemi.indexOf(rel);
        if (idx < 0) return null; // chromatický tón — mimo diatoniku: skip (později: nejbližší)
        return idx + 1; // 1..7
    }
    // group mel notes into beats: quarter-note grid dle header (uses tempo)
    const ppq = 480; // rough — better: from header
    const step = 0.5; // 1/8 takt (s)
    const lines = [];
    let cur = [];
    let lastT = 0;
    for (const n of mel) {
        const d = midiToDegree(n.midi);
        if (d == null) continue;
        // mezera mezi notami = pauza (držení)
        if (n.time - lastT > step * 1.5 && cur.length) { cur.push('-;'); lines.push(cur.join(' ')); cur = []; }
        cur.push('II:' + d);
        lastT = n.time + n.dur;
        if (cur.length >= 8) { lines.push(cur.join(' ')); cur = []; }
    }
    if (cur.length) lines.push(cur.join(' '));
    let out = 'key: ' + targetKey + '\n';
    out += lines.join('\n');
    return out;
}
function normalizeKeyName(k) {
    if (k === 'A#') return 'Bb';
    return k;
}

/* upload wiring: přidá MIDI volbu do file inputu + obsluhu */
function wireMidi() {
    const inp = document.getElementById('file');
    if (!inp) return;
    inp.setAttribute('accept', '.txt,.abc,.mid,.midi,text/plain,audio/midi');
    inp.addEventListener('change', e => {
        const f = e.target.files[0];
        if (!f) return;
        const name = (f.name || '').toLowerCase();
        if (name.endsWith('.mid') || name.endsWith('.midi')) {
            loadMidiLib(() => {
                const r = new FileReader();
                r.onload = () => {
                    try {
                        const { mel, bass } = parseMidi(r.result);
                        if (!mel.length) { alert('V MIDI nebyly rozpoznány žádné noty.'); return; }
                        const key = detectKey(mel);
                        // cílová tónina = selektor (nebo detekovaná, pokud v něm není)
                        const sel = document.getElementById('key');
                        const target = sel.value || key;
                        const txt = midiToText(mel, bass, target);
                        document.getElementById('input').value = 'title: ' + (f.name.replace(/\.(mid|midi)$/i, '')) + '\n' + txt;
                        doRender();
                        alert('MIDI rozpoznáno: ' + mel.length + ' not, detekovaná tónina ' + key + ', zapsáno do pole (doladit ručně dle potřeby).');
                    } catch (err) {
                        alert('MIDI parse selhal: ' + err.message);
                    }
                };
                r.readAsArrayBuffer(f);
            });
        } else {
            // původní chování (txt/abc) — viz app.js handler
        }
    });
}
window.addEventListener('DOMContentLoaded', wireMidi);
