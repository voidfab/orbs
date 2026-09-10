# presence

Shared **agentic-state bus** plus visualization realms for a full-duplex
human↔agent conversation with tool use. This is the expansion out of
`thinking-orbs-mega`: one bus, many bodies.

The primary interface is still STT → brain → tools → TTS. Painters subscribe
to `PresenceSnapshot`. They do not own the conversation.

```ts
import { FacePresence, GhostPresence, IdentityPresence, CssOrbPresence, OrbPresence, PresenceHost, reduceEvents } from 'presence';

const host = new PresenceHost({ audio: 'listen' });
host.push({ kind: 'session.start' });
host.ingestAudio({ input: rmsIn, output: rmsOut, vad });
host.subscribe((snapshot) => {
  /* painters read snapshot */
});

const snapshot = reduceEvents([
  { kind: 'session.start' },
  { kind: 'human.start' },
  { kind: 'human.end' },
  { kind: 'agent.think' },
  { kind: 'tool.start', name: 'Bash' },
  { kind: 'tool.permission', name: 'Bash' }
]);

<FacePresence snapshot={snapshot} />
<GhostPresence snapshot={snapshot} />
<OrbPresence snapshot={snapshot} />
<CssOrbPresence snapshot={snapshot} />
<IdentityPresence name="alice" snapshot={snapshot} />
```

Phases: `idle` · `listening` · `thinking` · `working` · `waiting` · `speaking` · `done` · `err` · `asleep`.

`waiting` is a permission / user-input gate. Duplex energy (`input` / `output`)
is independent of the named phase, matching Conversation Seam.

## Realms

| Realm | What it is |
|---|---|
| Face | Vendored [bloub](https://github.com/jeremy-prt/bloub) pose engine (14 Grok-measured states). Default body is the ball. |
| Ghost | Face variant: same two eyes on a sheet body (`GhostPresence` / `shape="ghost"`). Idle/listening hover (traveling hem). Wears all 14 catalog poses. Alert/exclaim keep a `!` beside the sheet. |
| Orb | Maps onto `thinking-orbs-mega` verbs (`waiting` → `waiting`, `err` → `error`, …) |
| CSS orb | Orbz layered WAAPI orb (not dots) |
| Identity | Vendored [blobatar](https://github.com/Alain00/blobatar) — who, with a bus expression |
| Glyph | Morphicons stroke morph (toolbar-scale, not orb blends) |
| Meter | Duplex waveform + spectrum + VU frames |
| Glow | Aurora mood ring (CSS/WAAPI; Metal not copied) |
| Textmode | Glyph Cast engines on a character grid (Seal / Hyphae / Beat / field) |
| Echo | Afterimage of the last phase (Cast runes or TTY face) |
| Braille | TTY needles / LED burst / sines in Unicode braille |
| Terminal | OSC 12 key palette + glyph face |

## Test

Same shape as the megafork: goldens + smokes.

```bash
cd presence
npm install
npm run spec          # rewrite spec/face-golden.json
npm test
npm run smoke         # tsc + vitest
npm run review        # http://127.0.0.1:5188/review.html
```

Conversation tab: click phases, drag in/out, or **play duplex turn**.
Live tab: mic VAD + demo TTS + tool events drive `PresenceHost`.
Face catalog tab: the 14 bloub poses, ball or ghost body.

## License

MIT. Face engine © Jérémy Perret (bloub). See [NOTICE.md](./NOTICE.md).
