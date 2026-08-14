# Glossary

Shared vocabulary for the megafork. Official thinking-orbs terms stay as Jakub defined them. Seam terms below are Fox9-original.

## Engine (official + extracts)

| Term | Meaning |
|---|---|
| **ModeFrame** | A painter that emits one instant of geometry. |
| **OrbFrame** | The finished, z-sorted `{dots, lines}` that any 2D renderer can draw. |
| **Original nine** | `working`, `searching`, `solving`, `listening`, `connecting`, `weaving`, `composing`, `breathing`, `shaping`. Untouched at sizes 20 and 64. |
| **Preset** | Hand-tuned `{speed, count, size}` for a mode at a size. Official tables at 20 and 64; Danko Swift `.large` at 128. |
| **Contour** | Line-cage family (`variant="contour"`). Not a ModeFrame morph. |
| **Cube remesh** | `shape="cube"` — the original nine on a cube substrate, not a 10th state. |
| **Synapse / relaying** | Web + spoke constellation with several electrons riding edges. Not the single-walker `reasoning` graph. |

## Conversation Seam

A dual-channel field for an STT → Brain → TTS turn. **Not** a ThinkingOrb state.

| Term | Meaning |
|---|---|
| **Domain** | One of two independent visual bodies. Acoustic energy does not cross. |
| **Internal** | Channel In (mic / STT). Driven by `inputVolume`. Lattice: orb / helix / cube. |
| **External** | Channel Out (speakers / TTS). Driven by `outputVolume`. Globe in v1, trefoil in v2. |
| **Generation** | `1` globe field. `2` closed (2,3) trefoil + internal lattice. |
| **Variant / layout** | How the two domains sit together — not a tint. **conduit** orb in a compact knot; **halo** helix in a wider wrap; **well** cube, cursor folds. |
| **Lattice** | The internal body shape. Today follows variant. Future: child states inside thinking. |
| **Phase** | Semantic turn: `idle` \| `listening` \| `thinking` \| `speaking`. Names the turn; it is not amplitude. |

## External objects (v2)

| Term | Meaning |
|---|---|
| **Knot / trefoil / ribbon** | Closed integer (2,3) torus knot. The primary external body. |
| **Ghost knot** | Fainter (3,5) overlay. Knob `ghost`. |
| **Filaments** | Loose bone threads around the knot. Atmosphere, not the knot. |
| **Rift** | Vertical bone + void seam through the middle (dominant / passive strand). Follows **thinking**. |
| **Rail** | Persistent winding *beside* the primary knot (Frenet offset). Not a mote. Count and crawl follow **thinking**. |
| **Mote** | A particle that is born, travels, dies. Inbound stay in the core. Outbound hop along the knot or a rail. |

## Effects

| Term | Meaning | Not |
|---|---|---|
| **Yaw** | Locked camera spin around vertical. | Do not drive with RMS. |
| **Tilt** | Locked camera nod. | |
| **Hitch** | Instant spin reverse. Default **off**. | The old think stutter. |
| **Breath** | Slow expand / contract of the *internal* lattice. | |
| **Pulse** | Uniform scale of the whole form (everything inflates together). | Wave. |
| **Wave** | Radial waveform on the *primary knot*: radius modulates as you walk `u`, and that modulation travels. Same family as the wave-ring speaking skin. Auto-mapped to **external RMS**. | Pulse. |
| **Travel** | Brightness sliding along the knot. Not a radius change. | Wave. |
| **Tube** | Knot thickness. | |
| **Fold** | Cursor twists nearby dots. Well layout. | |
| **Rail speed** | How fast rails crawl around the tube. Independent of mote speed. | Mote speed. |
| **Mote density / speed / duration** | How many particles, how fast they ride, how long they live. | Rail threads. |

## Audio

The seam sees two buses. Hosts pass them as `inputVolume` / `outputVolume`.

| Term | Meaning |
|---|---|
| **RMS** | Smoothed energy 0–1. Default drive for **wave** (external). |
| **Peak** | Instant amplitude crest. |
| **VAD** | RMS after a noise floor. “Is someone talking,” not “what.” |
| **Bass / mid / high** | FFT bands. |
| **Onset** | Spectral flux — syllable / transient hits. |
| **Centroid** | Brightness of the spectrum, 0–1. |
| **Thinking (mock)** | A 0–1 stand-in for brain load until a real signal exists. Drives **rift** and **rails**. |

Browsers cannot silently snoop the default output device. Demo voice plays through the speakers and analyses the same graph. **Tap speakers** uses tab/system capture (`getDisplayMedia`, Chrome / Edge). Hosts that already know TTS amplitude should pass that number.

## Knobs and bindings

| Term | Meaning |
|---|---|
| **Knob** | A named 0–1 (or ranged) control on the field. See `src/seam/knobs.ts`. |
| **Binding** | Routes a knob to `manual`, `thinking`, or a bus field (`out.rms`, `in.onset`, …). |
| **Admin override** | Demo panel on `/seam.html`. Phase chips stop driving knobs; sliders and bindings take over. |
