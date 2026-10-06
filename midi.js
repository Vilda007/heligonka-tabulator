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

/* ---- EXPORT: píseň (textový formát) → MIDI (.mid) ----
   Melodie (stupeň → MIDI not dle tóniny) + basy (basový pás, oktáva níž).
   Rytmus: 1 nota = 1 doba (quarter), skluz/glide = kratší, oblouček ~ = legato spoj. */
const KEY_TONIC_PC = { C:0, F:5, G:7, A:9, D:2, Bb:10 };
const KEY_SCALE_PC = {
    C: [0,2,4,5,7,9,11], F: [5,7,9,10,12,14,16], G: [7,9,11,12,14,16,18],
    A: [9,11,13,14,16,18,20], D: [2,4,6,7,9,11,13], Bb: [10,12,14,15,17,19,21]
};
const APP_BASS_PC = { F:41, B:46, C:48, G:43, D:38, A:45, E:40, H:47,
                     f:29, b:34, c:36, g:31, d:26, a:33, e:28, h:35 };

function degToMidiNote(deg, key) {
    const scale = KEY_SCALE_PC[key] || KEY_SCALE_PC.F;
    const d = ((deg - 1) % 7 + 7) % 7;
    const oct = Math.floor((deg - 1) / 7);
    /* 48 + PC stupně (scale[d] = absolutní pitch class) + 12 na oktávu;
       tónika (deg1, oct0) pro Bb = 48+10 = 58 (Bb3) */
    return 48 + scale[d] + 12 * oct;
}

function exportSongToMidi(title, key, text) {
    loadMidiLib(() => {
        try {
            const song = new Midi();
            song.header.setTempo(120);
            const track = song.addTrack();
            const bassTrack = song.addTrack();
            const BEAT = 0.5; // quarter = 0.5 s při 120 BPM
            let t = 0;
            for (const raw of (text || '').split(/\r?\n/)) {
                const line = raw.trim();
                if (!line || /^(title|key|abc|v\s*\d+)\s*:/i.test(line)) continue;
                for (const tok of line.split(/\s+/)) {
                    if (!tok) continue;
                    const semi = tok.indexOf(';');
                    const head = semi >= 0 ? tok.slice(0, semi) : tok;
                    const bass = semi >= 0 ? tok.slice(semi + 1) : '';
                    const tie = head.endsWith('~');
                    const h = head.replace(/~$/, '');
                    if (h === '-' || h === '') { /* držení — bas se ale zapíše! */
                        if (bass && APP_BASS_PC[bass] != null) {
                            bassTrack.addNote({ midi: APP_BASS_PC[bass], time: t, duration: BEAT, velocity: 80 });
                        }
                        t += BEAT;
                        continue;
                    }
                    const m = h.match(/^(?:II|I):(\d+)(?:\/(\d+))?$/);
                    if (m) {
                        const note = degToMidiNote(parseInt(m[1], 10), key);
                        const glideTo = m[2] ? degToMidiNote(parseInt(m[2], 10), key) : null;
                        if (glideTo) {
                            /* skluzovka: rychlá dvojnota v rámci doby */
                            track.addNote({ midi: note, time: t, duration: BEAT * 0.4, velocity: 100 });
                            track.addNote({ midi: glideTo, time: t + BEAT * 0.5, duration: BEAT * 0.5, velocity: 100 });
                        } else {
                            track.addNote({ midi: note, time: t, duration: BEAT * (tie ? 1.4 : 1), velocity: 100 });
                        }
                        t += BEAT;
                    } else {
                        t += BEAT;
                    }
                    if (bass && APP_BASS_PC[bass] != null) {
                        bassTrack.addNote({ midi: APP_BASS_PC[bass], time: t - BEAT, duration: BEAT, velocity: 80 });
                    }
                }
            }
            const buf = song.toArray();
            const blob = new Blob([buf], { type: 'audio/midi' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = (title || 'pisen').replace(/[\\/:*?"<>|]/g, '_') + '.mid';
            a.click();
            URL.revokeObjectURL(a.href);
        } catch (err) { alert('MIDI export selhal: ' + err.message); }
    });
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
