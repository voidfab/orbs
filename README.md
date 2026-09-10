# orbs

**Canonical orb engine:** [`thinking-orbs-mega/`](./thinking-orbs-mega/)

**Other visualization realms** (face, ghost, identity, terminal, meters, glow, textmode, echo, braille): [`REALMS.md`](./REALMS.md). The usable package is [`presence/`](./presence/) — shared conversation bus plus painters for each realm. Ghost is the bloub two-eye face on a sheet body; Echo is the lagged afterimage of the last phase.

Later drops still to review live in `_new/` (gitignored). Orb remotes: [`thinking-orbs-mega/SOURCES.md`](./thinking-orbs-mega/SOURCES.md). Presence attributions: [`presence/NOTICE.md`](./presence/NOTICE.md).

```bash
cd thinking-orbs-mega
npm install
npm test
npm run review          # http://127.0.0.1:5177/play.html

cd ../presence
npm install
npm test
npm run review          # http://127.0.0.1:5188/review.html
```
