# Hermes Desktop — Thinking Orbs

A Hermes Desktop plugin that paints the megafork `ModeFrame` engine (official nine plus extras). Status-bar chip + a right pane. It observes gateway session events and the native `hermes:voice-bus`. It never opens the microphone.

Hermes only allows `@hermes/plugin-sdk`, `react`, and `react/jsx-runtime` as imports. `npm run build` (from this folder, or `npm run build:hermes` in the megafork root) bundles the engine into a single `plugin.js`.

## Install

```bash
cd thinking-orbs-mega
npm install
npm run build:hermes
mkdir -p ~/.hermes/desktop-plugins/thinking-orbs
cp ports/hermes/plugin.js ~/.hermes/desktop-plugins/thinking-orbs/plugin.js
```

If you run a named profile (`hermes -p fox9`):

```bash
mkdir -p ~/.hermes/profiles/fox9/desktop-plugins/thinking-orbs
cp ports/hermes/plugin.js ~/.hermes/profiles/fox9/desktop-plugins/thinking-orbs/plugin.js
```

Then **Reload desktop plugins** from ⌘K. Enable **Thinking Orbs** in Settings → Plugins if it is listed off.

## Use

- Right pane **thinking orb** — live state, 96px.
- Status chip — 18px live orb.
- ⌘K → **Thinking Orbs: Preview cycle** — walks listen / think / search / work / shape / compose / speak.
- ⌘K → **Thinking Orbs: Back to live**.

Voice phases on `hermes:voice-bus` map to `listening` / `thinking` / `speaking`. Gateway `message.start` → thinking, `message.delta` → composing, tool starts → working / searching / shaping.

The pane follows `host.state.focusedSessionId` (tile-aware, post-Desktop update) and falls back to `activeSessionId` on older builds. Per-session orb state is cached so switching tiles restores that session's last verb.

## License

MIT. Engine © Jakub Antalik (thinking-orbs 0.3.1) and Fox9 / voidfab.
