/** Sync name → triad gradient. Vercel `avatar` used SHA-1 + tinycolor; we keep the look without those deps. */

function hashCode(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

export function gradientSvg(name: string, size = 96): string {
  const n = hashCode(name || 'presence');
  const h = n % 360;
  const from = hsl(h, 0.92, 0.52);
  const to = hsl((h + 120) % 360, 0.88, 0.46);
  const id = `g${n.toString(16)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="${size}" height="${size}" role="img"><title>${escapeXml(
    name
  )}</title><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><circle cx="40" cy="40" r="40" fill="url(#${id})"/></svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
