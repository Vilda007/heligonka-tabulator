/* Heligonka Tabulator — osnova.js (v6)
   Notová osnova: zobrazení melodie v notách (VexFlow CDN).
   - Přepínač „Osnova" v Tabulátoru vykreslí pod tabulaturou notovou osnovu melodie
   - Noty = stupně → MIDI pitch dle tóniny (stejná logika jako MIDI export)
   - Rytmus: 1 nota = 1 čtvrtka (zjednodušeně), skluzovky jako osminy */

const VEXFLOW_CDN = 'https://unpkg.com/vexflow@4.2.3/build/cjs/vexflow.js';

function loadVexflowLib(cb) {
    if (window.Vex || window.VexFlow) { cb(); return; }
    const s = document.createElement('script');
    s.src = VEXFLOW_CDN;
    s.onload = cb;
    s.onerror = () => alert('Knihovnu VexFlow nelze načíst (offline?).');
    document.head.appendChild(s);
}

/* reuse pitch logiky z midi.js (degToMidiNote), fallback zde pro jistotu */
function osnovaDegToMidi(deg, key) {
    if (typeof degToMidiNote === 'function') return degToMidiNote(deg, key);
    const scale = { C:[0,2,4,5,7,9,11], F:[5,7,9,10,12,14,16], G:[7,9,11,12,14,16,18],
                    A:[9,11,13,14,16,18,20], D:[2,4,6,7,9,11,13], Bb:[10,12,14,15,17,19,21] }[key] || [5,7,9,10,12,14,16];
    const d = ((deg - 1) % 7 + 7) % 7;
    const oct = Math.floor((deg - 1) / 7);
    return 48 + scale[d] + 12 * oct;
}

/* VexFlow notový zápis: "C#/4" apod. z MIDI pitch */
function osnovaMidiToVF(midi) {
    const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const pc = midi % 12;
    const oct = Math.floor(midi / 12) - 1;
    return names[pc] + '/' + oct;
}

function renderOsnova() {
    const out = document.getElementById('osnova-output');
    if (!out || !out.style || out.style.display === 'none') return;
    const inp = document.getElementById('input');
    const keySel = document.getElementById('key');
    if (!inp) return;
    const key = keySel ? keySel.value : 'F';
    /* naparsej noty z textového formátu */
    const notes = [];
    for (const raw of (inp.value || '').split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || /^(title|key|abc|v\s*\d+)\s*:/i.test(line)) continue;
        for (const tok of line.split(/\s+/)) {
            if (!tok) continue;
            const head = tok.split(';')[0];
            const h = head.replace(/~$/, '');
            if (h === '-' || h === '' || /^>>|<</.test(h) || /^!?-/.test(h)) { notes.push({ rest: true }); continue; }
            const m = h.match(/^(?:II|I):(\d+)(?:\/(\d+))?$/);
            if (!m) continue;
            const midi = osnovaDegToMidi(parseInt(m[1], 10), key);
            notes.push({ midi, glide: m[2] ? osnovaDegToMidi(parseInt(m[2], 10), key) : null });
        }
    }
    loadVexflowLib(() => {
        try {
            const VF = window.Vex || window.VexFlow;
            out.innerHTML = '';
            const div = document.createElement('div');
            div.className = 'osnova-inner';
            out.appendChild(div);
            const renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
            const perRow = 16;
            const rows = Math.max(1, Math.ceil(notes.length / perRow));
            renderer.resize(820, 120 * rows + 40);
            const context = renderer.getContext();
            let y = 0;
            for (let r = 0; r < rows; r++) {
                const stave = new VF.Stave(10, y, 800);
                stave.addClef('treble').addTimeSignature('4/4');
                stave.setContext(context).draw();
                const batch = notes.slice(r * perRow, (r + 1) * perRow);
                const vfNotes = [];
                const bars = []; /* indexy vfNotes, za kterými patří taktová čára (4/4 = po 4 čtvrtkách) */
                let beatsInBar = 0;
                batch.forEach(n => {
                    if (n.rest) vfNotes.push(new VF.StaveNote({ keys: ['b/4'], duration: 'q' }));
                    else {
                        /* skluzovka = celá doba (hraniční tóny v rámci jedné doby): čtvrtka s » */
                        const st = new VF.StaveNote({ keys: [osnovaMidiToVF(n.midi)], duration: 'q' });
                        if (n.glide) st.addModifier(new VF.Annotation('»' + osnovaMidiToVF(n.glide).split('/')[0]), 0);
                        vfNotes.push(st);
                    }
                    beatsInBar += 1;
                    if (beatsInBar >= 4 && vfNotes.length < batch.length) { bars.push(vfNotes.length - 1); beatsInBar = 0; }
                });
                if (vfNotes.length) {
                    VF.Formatter.FormatAndDraw(context, stave, vfNotes);
                    /* taktové čáry: svislá linka od horní k dolní lince osnovy za koncovou notou taktu */
                    for (const bi of bars) {
                        const note = vfNotes[bi];
                        const x = note.getAbsoluteX() + note.getWidth() + 6;
                        const top = stave.getYForLine(0) - 8;
                        const bottom = stave.getYForLine(4) + 8;
                        context.fillRect(x, top, 1.5, bottom - top);
                    }
                }
                y += 120;
            }
        } catch (err) {
            out.innerHTML = '<p class="hint" style="color:#a33">Osnovu nelze vykreslit: ' + (err.message || err) + '</p>';
        }
    });
}

function wireOsnova() {
    const tog = document.getElementById('toggle-osnova');
    const out = document.getElementById('osnova-output');
    if (!tog || !out) return;
    tog.addEventListener('click', () => {
        const shown = out.style.display === 'none';
        out.style.display = shown ? 'block' : 'none';
        tog.classList.toggle('on', shown);
        if (shown) renderOsnova();
    });
    const renderBtn = document.getElementById('render');
    if (renderBtn) renderBtn.addEventListener('click', () => { if (out.style.display !== 'none') renderOsnova(); });
}
window.addEventListener('DOMContentLoaded', wireOsnova);