// Mode key → geometry builder. Kept separate from the presets so tree
// shaking can in principle drop unused modes in custom builds.

import type { ModeKey } from '../presets';
import { asFrame } from './adapt';
import { buildShatter } from './burst';
import { buildCluster } from './cluster';
import type { ModeDraw, ModeFrame } from './types';
import { paintFrame } from './core';
import { buildCube } from './cube';
import { buildFault } from './fault';
import { buildFunnel, buildVortex } from './flow';
import { buildGraph } from './graph';
import { buildCascade, buildRaster } from './grid';
import { buildHelix } from './helix';
import { buildIgnite } from './ignite';
import { frameBraid } from './braid';
import { frameGlobe, frameRubik, frameWave } from './lattice';
import { frameMorph } from './morph';
import { frameOrbits } from './orbits';
import { buildDetour, buildFlightpath } from './path';
import { buildPins } from './pins';
import { buildEcho, buildFocus, buildGyro, buildRest } from './rest';
import { frameRibbon } from './ribbon';
import { buildAttest } from './ring';
import { buildSonar } from './rings';
import { buildRoute } from './route';
import { buildSeal } from './seal';
import { buildVigil } from './vigil';
import {
  frameAssembling,
  frameBuilding,
  frameConjuring,
  frameHypercube,
  frameResponding
} from './solid-extras';
import { frameCognition, framePresence, frameSpeaking } from './presence';
import { frameSynapse } from './synapse';
import { frameWeb } from './web';

/**
 * The portable surface: pure geometry, no canvas. Official 0.3.1 frames
 * stay first-class; extra-fork modes are adapted from DotBuffer builders.
 */
export const MODE_FRAMES: Record<ModeKey, ModeFrame> = {
  orbits: frameOrbits,
  globe: frameGlobe,
  rubik: frameRubik,
  wave: frameWave,
  web: frameWeb,
  braid: frameBraid,
  ribbon: frameRibbon,
  ring: frameRibbon,
  morph: frameMorph,
  rest: asFrame(buildRest),
  focus: asFrame(buildFocus),
  gyro: asFrame(buildGyro),
  echo: asFrame(buildEcho),
  cube: asFrame(buildCube),
  route: asFrame(buildRoute),
  sonar: asFrame(buildSonar),
  graph: asFrame(buildGraph),
  funnel: asFrame(buildFunnel),
  raster: asFrame(buildRaster),
  vortex: asFrame(buildVortex),
  helix: asFrame(buildHelix),
  cluster: asFrame(buildCluster),
  cascade: asFrame(buildCascade),
  shatter: asFrame(buildShatter),
  fault: asFrame(buildFault),
  seal: asFrame(buildSeal),
  flightpath: asFrame(buildFlightpath),
  detour: asFrame(buildDetour),
  vigil: asFrame(buildVigil),
  attest: asFrame(buildAttest),
  ignite: asFrame(buildIgnite),
  pins: asFrame(buildPins),
  building: frameBuilding,
  tesseract: frameHypercube,
  merkaba: frameConjuring,
  assembling: frameAssembling,
  responding: frameResponding,
  field: framePresence,
  cognition: frameCognition,
  ripple: frameSpeaking,
  synapse: frameSynapse
};

/** Canvas painters, derived from the geometry. The 2D-canvas binding. */
export const MODE_DRAWS: Record<ModeKey, ModeDraw> = Object.fromEntries(
  Object.entries(MODE_FRAMES).map(([key, frame]) => [
    key,
    ((ctx, size, t, dark, opts) => paintFrame(ctx, frame(size, t, opts), dark)) as ModeDraw
  ])
) as Record<ModeKey, ModeDraw>;
