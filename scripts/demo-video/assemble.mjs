// Monta el vídeo final: clip por escena (fotogramas → H.264 30 fps), fundidos cruzados,
// SRT con los rótulos en la línea de tiempo final y una captura de apoyo por escena.
// Uso: node assemble.mjs <depsVideoDir> <recOutDir> <destDir>
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const [depsDir, recDir, destDir] = process.argv.slice(2)
const ffmpeg = createRequire(`${depsDir}/package.json`)('ffmpeg-static')
const clips = JSON.parse(readFileSync(`${recDir}/timeline.json`, 'utf8'))
const XF = 0.6 // duración del fundido entre clips
mkdirSync(`${recDir}/clips`, { recursive: true }); mkdirSync(destDir, { recursive: true }); mkdirSync(`${destDir}/capturas`, { recursive: true })
const run = (args) => execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] })

// Tiempos muertos anómalos (p. ej. el equipo suspendido en mitad de una escena): más de
// MAX_GAP s sin ningún fotograma no puede ser una pausa del guion (la más larga es ~3 s).
// Se dejan KEEP s y se desplaza lo posterior —fotogramas, rótulos y final— lo mismo.
const MAX_GAP = 10, KEEP = 1
for (const c of clips) {
  const cuts = [] // { at: instante (absoluto) a partir del cual se resta, amount }
  for (let k = 1; k < c.frames.length; k++) {
    const gap = c.frames[k].t - c.frames[k - 1].t
    if (gap > MAX_GAP) cuts.push({ at: c.frames[k - 1].t + KEEP, amount: gap - KEEP })
  }
  if (!cuts.length) continue
  const shift = (t) => t - cuts.filter((x) => t >= x.at).reduce((s, x) => s + x.amount, 0)
  for (const f of c.frames) f.t = shift(f.t)
  for (const cap of c.captions) { cap.start = shift(c.t0 + cap.start) - c.t0; cap.end = shift(c.t0 + cap.end) - c.t0 }
  c.t1 = shift(c.t1)
  console.log(`clip ${c.name}: recortados ${cuts.map((x) => x.amount.toFixed(0) + ' s').join(', ')} de tiempo muerto`)
}

const encoded = []
for (const [i, c] of clips.entries()) {
  if (!c.frames.length) { console.log(`clip ${c.name}: sin fotogramas, se omite`); continue }
  const dur = c.t1 - c.t0
  const list = []
  c.frames.forEach((f, k) => {
    const start = k === 0 ? c.t0 : f.t
    const next = k + 1 < c.frames.length ? c.frames[k + 1].t : c.t1
    list.push(`file '${f.file.replace(/'/g, "'\\''")}'`, `duration ${Math.max(0.001, next - start).toFixed(4)}`)
  })
  list.push(`file '${c.frames[c.frames.length - 1].file}'`)
  const listFile = `${recDir}/clips/${String(i).padStart(2, '0')}.txt`
  writeFileSync(listFile, list.join('\n'))
  const out = `${recDir}/clips/${String(i).padStart(2, '0')}-${c.name}.mp4`
  run(['-f', 'concat', '-safe', '0', '-i', listFile, '-vf', 'fps=30,scale=1920:1080:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', '30', '-t', dur.toFixed(3), out])
  // Captura de apoyo: el fotograma del 60 % de la escena (no de las tarjetas).
  if (!c.name.startsWith('card-')) copyFileSync(c.frames[Math.floor(c.frames.length * 0.6)].file, `${destDir}/capturas/${String(encoded.length + 1).padStart(2, '0')}-${c.name}.jpg`)
  encoded.push({ ...c, file: out, dur })
  console.log(`clip ${c.name}: ${dur.toFixed(1)} s, ${c.frames.length} fotogramas`)
}

// Fundidos cruzados encadenados: el clip k entra en offset_k = Σ dur(0..k-1) − k·XF.
const inputs = encoded.flatMap((c) => ['-i', c.file])
let filter = ''; let prev = '[0:v]'; let acc = encoded[0].dur
const starts = [0]
for (let k = 1; k < encoded.length; k++) {
  const offset = acc - XF
  starts.push(offset)
  const outLabel = k === encoded.length - 1 ? '[vout]' : `[v${k}]`
  filter += `${prev}[${k}:v]xfade=transition=fade:duration=${XF}:offset=${offset.toFixed(3)}${outLabel};`
  prev = outLabel; acc = offset + encoded[k].dur
}
const finalFile = `${destDir}/FEEDMA_demo_guiada.mp4`
run([...inputs, '-filter_complex', filter.replace(/;$/, ''), '-map', '[vout]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', finalFile])

// Subtítulos: cada rótulo, desplazado al inicio de su clip en el vídeo final.
const ts = (s) => { const ms = Math.max(0, Math.round(s * 1000)); const h = Math.floor(ms / 3600000); const m = Math.floor(ms / 60000) % 60; const sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}` }
const cues = []
encoded.forEach((c, k) => {
  for (const cap of c.captions) {
    const a = starts[k] + cap.start + 0.15; const b = Math.min(starts[k] + cap.end, starts[k] + c.dur)
    if (b - a > 0.4) cues.push({ a, b, text: cap.text })
  }
})
cues.sort((x, y) => x.a - y.a)
for (let i = 0; i + 1 < cues.length; i++) if (cues[i].b > cues[i + 1].a - 0.05) cues[i].b = cues[i + 1].a - 0.05
writeFileSync(`${destDir}/FEEDMA_demo_guiada.srt`, cues.map((q, i) => `${i + 1}\n${ts(q.a)} --> ${ts(q.b)}\n${q.text}\n`).join('\n'))
writeFileSync(`${destDir}/montaje.json`, JSON.stringify(encoded.map((c, k) => ({ escena: c.name, inicio: Number(starts[k].toFixed(2)), duracion: Number(c.dur.toFixed(2)), rotulos: c.captions.map((x) => x.text) })), null, 1))
console.log(`Vídeo: ${finalFile} (${acc.toFixed(1)} s) · ${cues.length} subtítulos · ${encoded.length} clips`)
if (!existsSync(finalFile)) process.exit(1)
