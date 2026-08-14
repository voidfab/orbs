import type { StyleProp, ViewProps, ViewStyle } from 'react-native';
import type { OrbState, OrbTheme } from '../types';

export type NativeOrbSize = number;

export interface NativeThinkingOrbProps
  extends Omit<ViewProps, 'accessibilityLabel' | 'style'> {
  /** Which of the six animations to show. @default 'working' */
  state?: OrbState;

  /**
   * Rendered size in density-independent pixels. Values below 40 use the
   * upstream 20px tuning; larger values use the 64px tuning. @default 64
   */
  size?: NativeOrbSize;

  /**
   * Theme mode. `auto` follows React Native's current color scheme.
   * @default 'auto'
   */
  theme?: OrbTheme;

  /** Animation speed multiplier. @default 1 */
  speed?: number;

  /** Freeze the animation on its current frame. @default false */
  paused?: boolean;

  /** Maximum JS render rate. @default 30 */
  frameRate?: number;

  /**
   * Dot-density multiplier. Values below 1 trade detail for fewer native
   * views; values above 1 add detail. @default 1
   */
  density?: number;

  /** Deterministic initial animation time in seconds. @default 0.6 */
  initialTime?: number;

  /** Override the state-specific screen-reader label. */
  accessibilityLabel?: string;

  style?: StyleProp<ViewStyle>;
}
