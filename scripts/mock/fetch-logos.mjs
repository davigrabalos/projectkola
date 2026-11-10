// Downloads each hiring partner's own logo mark (from its website's <link rel="icon"> tags) into
// public/logos/ and writes src/data/logos.ts (company id -> path). Self-hosted, so the app makes no
// third-party requests at runtime. Companies with no usable icon keep their initials.
// Run: npm run mock:logos   (one company: npm run mock:logos -- stone)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOARDS } from '../../worker/sources.ts';

const UA = 'KolaJobs/0.1 (logo refresh for a job board; links back to every original posting)';
const MIN_PX = 64;          // smaller raster icons look blurry in the 80px tile
const MAX_BYTES = 300_000;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, 'public/logos');
const only = process.argv.slice(2);

const get = (url) => fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(15_000) });
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))?.slice(2).find((v) => v !== undefined);

/** Icon candidates from the page head, best first: SVG, then the largest PNG/touch icon; .ico last (only big ones are kept). */
function candidates(html, base) {
  const out = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = (attr(tag, 'rel') ?? '').toLowerCase();
    const href = attr(tag, 'href');
    if (!href || !/\b(icon|apple-touch-icon|apple-touch-icon-precomposed)\b/.test(rel) || /mask-icon/.test(rel)) continue;
    let url; try { url = new URL(href.replace(/&amp;/g, '&'), base).href; } catch { continue; }
    if (/\.ico(\?|$)/i.test(url)) { out.push({ url, score: 5 }); continue; }
    const size = Math.max(0, ...(attr(tag, 'sizes') ?? '').split(/\s+/).map((s) => parseInt(s, 10) || 0));
    const svg = /svg/i.test(attr(tag, 'type') ?? '') || /\.svg(\?|$)/i.test(url);
    out.push({ url, score: svg ? 10_000 : (rel.includes('apple') ? 2000 + (size || 180) : size) });
  }
  out.push({ url: new URL('/apple-touch-icon.png', base).href, score: 1500 }, { url: new URL('/favicon.ico', base).href, score: 4 });
  const manifest = html.match(/<link\b[^>]*rel\s*=\s*["']?manifest[^>]*>/i)?.[0];
  if (manifest && attr(manifest, 'href')) out.push({ manifest: new URL(attr(manifest, 'href').replace(/&amp;/g, '&'), base).href, score: 1000 });
  return out.sort((a, b) => b.score - a.score).filter((c, i, a) => a.findIndex((d) => d.url === c.url) === i);
}

/** Pixel size of a PNG/JPEG/WebP, or 0 if unknown. */
function rasterSize(b) {
  if (b[0] === 0x89 && b[1] === 0x50) return Math.min(b.readUInt32BE(16), b.readUInt32BE(20));
  if (b.toString('ascii', 8, 12) === 'WEBP') {
    const k = b.toString('ascii', 12, 16);
    if (k === 'VP8 ') return Math.min(b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff);
    if (k === 'VP8L') { const v = b.readUInt32LE(21); return Math.min((v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1); }
    if (k === 'VP8X') return Math.min(b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1);
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length - 9;) {
      const m = b[i + 1], len = b.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xc3) return Math.min(b.readUInt16BE(i + 5), b.readUInt16BE(i + 7));
      i += 2 + len;
    }
  }
  return 0;
}

async function download(url) {
  const res = await get(url);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100 || buf.length > MAX_BYTES) return null;
  const head = buf.toString('utf8', 0, 400).trimStart();
  if (/^(<\?xml[\s\S]*?)?(<!--[\s\S]*?-->\s*)*<svg\b/i.test(head) || (/<svg\b/i.test(head) && !/<html/i.test(head))) {
    const svg = buf.toString('utf8');
    if (/<script\b|\bon\w+\s*=/i.test(svg)) return null; // never serve active SVG from our origin
    // Icons that recolour themselves for dark mode would turn white on our white tile.
    if (/prefers-color-scheme/i.test(svg)) return null;
    return { ext: 'svg', buf };
  }
  // ICO: keep it only if its largest image is big enough (a width byte of 0 means 256px). Browsers render .ico in <img>.
  if (buf.readUInt16LE(0) === 0 && buf.readUInt16LE(2) === 1) {
    const n = buf.readUInt16LE(4);
    const px = Math.max(0, ...Array.from({ length: n }, (_, i) => buf[6 + i * 16] || 256));
    return px >= MIN_PX ? { ext: 'ico', buf } : null;
  }
  const ext = buf[0] === 0x89 ? 'png' : buf[0] === 0xff ? 'jpg' : buf.toString('ascii', 8, 12) === 'WEBP' ? 'webp' : null;
  if (!ext || rasterSize(buf) < MIN_PX) return null;
  return { ext, buf };
}

fs.mkdirSync(outDir, { recursive: true });
const logosFile = path.join(root, 'src/data/logos.ts');
const prev = fs.existsSync(logosFile) ? JSON.parse(fs.readFileSync(logosFile, 'utf8').match(/= (\{[\s\S]*\});/)?.[1] ?? '{}') : {};
const logos = only.length ? { ...prev } : {};

for (const { company } of BOARDS) {
  if (only.length && !only.includes(company.id)) continue;
  let saved = null;
  try {
    const page = await get(company.website);
    const list = candidates(page.ok ? await page.text() : '', page.url || company.website);
    // A web manifest lists app icons (usually 192/512px): expand it in place into its own candidates.
    for (let i = 0; i < list.length; i++) {
      if (!list[i].manifest) continue;
      const m = await get(list[i].manifest).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      const icons = (m?.icons ?? []).filter((ic) => ic.src && !/maskable/.test(ic.purpose ?? '') && !/\.ico(\?|$)/i.test(ic.src))
        .map((ic) => ({ url: new URL(ic.src, list[i].manifest).href, size: Math.max(0, ...String(ic.sizes ?? '').split(/\s+/).map((x) => parseInt(x, 10) || 0)) }))
        .sort((a, b) => b.size - a.size);
      list.splice(i, 1, ...icons.map(({ url }) => ({ url, score: 1000 })));
      i += icons.length - 1;
    }
    for (const c of list) {
      const got = await download(c.url).catch(() => null);
      if (!got) continue;
      for (const f of fs.readdirSync(outDir)) if (f.startsWith(`${company.id}.`)) fs.unlinkSync(path.join(outDir, f));
      fs.writeFileSync(path.join(outDir, `${company.id}.${got.ext}`), got.buf);
      saved = { file: `/logos/${company.id}.${got.ext}`, from: c.url, bytes: got.buf.length };
      break;
    }
  } catch (e) { saved = null; console.log(`${company.name.padEnd(16)} error: ${e.message}`); }
  if (saved) logos[company.id] = saved.file; else delete logos[company.id];
  console.log(`${company.name.padEnd(16)} ${saved ? `${saved.file.padEnd(26)} ${String(saved.bytes).padStart(6)} B  ${saved.from}` : 'no usable icon - initials'}`);
}

fs.writeFileSync(logosFile,
  `// GENERATED by scripts/mock/fetch-logos.mjs on ${new Date().toISOString().slice(0, 10)} - do not edit by hand (npm run mock:logos).\n` +
  `// Company id -> self-hosted logo in public/logos/. Companies missing here show their initials.\n` +
  `export const logos: Record<string, string> = ${JSON.stringify(logos, null, 1)};\n`);
console.log(`\n${Object.keys(logos).length} logos written to public/logos/.`);
