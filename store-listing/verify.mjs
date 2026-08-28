#!/usr/bin/env node
/** Asserts the store-side constraints that cause automated rejection. */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { TARGETS } from './slides.mjs';

const ROOT = import.meta.dirname;
let fail = 0;
const bad = (m) => { console.log(`  FAIL ${m}`); fail++; };

for (const [name, t] of Object.entries(TARGETS)) {
  const dir = resolve(ROOT, 'dist', name);
  let files;
  try { files = readdirSync(dir).filter((f) => f.endsWith(`.${t.ext}`)).sort(); }
  catch { console.log(`\n${name}: not built, skipping`); continue; }

  console.log(`\n${name}  (${files.length} files)`);
  for (const f of files) {
    const p = resolve(dir, f);
    // %[channels] can render as "srgb  3.0", so delimit explicitly rather than split on space.
    const [w, h, channels, depth] = execFileSync(
      'magick', ['identify', '-format', '%w|%h|%[channels]|%z', p],
    ).toString().split('|').map((s) => s.trim());

    if (+w !== t.width || +h !== t.height) bad(`${f} is ${w}x${h}, want ${t.width}x${t.height}`);
    // Both stores reject alpha. srgba/rgba here means guaranteed rejection.
    if (/a\b/.test(channels)) bad(`${f} has an alpha channel (${channels})`);
    if (depth !== '8') bad(`${f} is ${depth}-bit, want 8`);
    const ratio = Math.max(w, h) / Math.min(w, h);
    // Play's hard cap: the long side may not exceed twice the short side.
    if (name === 'play' && ratio > 2) bad(`${f} aspect ${ratio.toFixed(3)} exceeds Play's 2:1 cap`);
    console.log(`  ok  ${f}  ${w}x${h} ${channels} ${depth}-bit  ${(statSync(p).size / 1024).toFixed(0)}KB  ratio ${ratio.toFixed(3)}`);
  }
}
console.log(fail ? `\n${fail} failure(s)` : '\nAll checks passed');
process.exit(fail ? 1 : 0);
