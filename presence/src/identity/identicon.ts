import { GROKBOT_BRAND } from '../face/brand';

/** Deterministic marble-style identicon (boring-avatars hash). Fallback when blobatar is too heavy. */

function hashCode(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const PALETTE = GROKBOT_BRAND.filter((c) => c.name !== 'WHITE' && c.name !== 'GREY').map((c) => c.hex);

export function identiconSvg(name: string, size = 96): string {
  const n = hashCode(name || 'presence');
  const c0 = PALETTE[n % PALETTE.length]!;
  const c1 = PALETTE[(n >> 3) % PALETTE.length]!;
  const c2 = PALETTE[(n >> 6) % PALETTE.length]!;
  const rot = n % 360;
  const tx = (n % 9) - 4;
  const ty = ((n >> 4) % 9) - 4;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="${size}" height="${size}" role="img"><title>${escapeXml(
    name
  )}</title><defs><clipPath id="m"><circle cx="40" cy="40" r="40"/></clipPath></defs><g clip-path="url(#m)"><rect width="80" height="80" fill="${c0}"/><path d="M32 59L50 70H72V-1H33L26 13l19 27L32 59z" fill="${c1}" transform="translate(${tx} ${ty}) rotate(${rot} 40 40)"/><path d="M22 24L0 47l14 38 64 1-3-59-22 4 13 20-23 27L22 24z" fill="${c2}" opacity="0.85" transform="translate(${-tx} ${ty}) rotate(${(rot + 80) % 360} 40 40)"/></g></svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
