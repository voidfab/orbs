import type { ModeKey } from '../../presets';
import type { ModeDraw } from '../types';
import {
  drawContourConnecting,
  drawContourGlobe,
  drawContourIdle,
  drawContourMorph,
  drawContourResponding,
  drawContourRibbon,
  drawContourRubik
} from './family';
import { drawContourListening, drawContourWorking } from './working-listening';

export { setContourTint, type ContourInk } from './ink';

/** Contour (line) painters. Missing keys fall back to the dotted ModeFrame. */
export const CONTOUR_DRAWS: Partial<Record<ModeKey, ModeDraw>> = {
  rest: drawContourIdle,
  orbits: drawContourWorking,
  web: drawContourConnecting,
  globe: drawContourGlobe,
  rubik: drawContourRubik,
  wave: drawContourListening,
  ribbon: drawContourRibbon,
  ring: drawContourRibbon,
  responding: drawContourResponding,
  morph: drawContourMorph
};
