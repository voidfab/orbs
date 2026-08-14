# Changelog

## 0.4.0 — unpublished

Megafork of thinking-orbs **0.3.1** (`e04f3e8`). Not released to npm until explicitly approved.

### Engine

- Official original nine at 20 / 64 remain golden-identical (72 vectors, 1e-4).
- Any size 12–256; size 128 uses the Danko Swift `.large` table.
- Fork extras: cube remesh, contour family, pointer spring, extra verbs and palettes. See [FORKS.md](./FORKS.md).

### Conversation Seam (new)

- Dual-channel field: **internal** = mic, **external** = speakers.
- Generation 1 globe; generation 2 closed (2,3) trefoil.
- Layouts: conduit / halo / well.
- Knobs: rift, ghost, filaments, motes, rails, breath, pulse, **wave** (radial waveform on the primary knot).
- Camera yaw / tilt / hitch locked off phase. Auto map: external RMS → wave; thinking → rails + rift.
- `SeamAudio` / `useSeamAudio`: demo voice, speaker tap, mic; RMS / peak / VAD / bands / onset / centroid.

### Docs

- [GLOSSARY.md](./GLOSSARY.md) — shared terms.
- [NOTICE.md](./NOTICE.md) — upstream and fork attribution.

### Verify

```bash
npm run smoke          # tsc + vitest
npm run pack:check     # npm pack --dry-run
```

Do not run `npm publish` until the maintainer says so.
