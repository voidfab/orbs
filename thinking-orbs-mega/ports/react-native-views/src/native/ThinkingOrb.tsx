import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  StyleSheet,
  useColorScheme,
  View
} from 'react-native';
import { resolvePreset } from '../presets';
import type { OrbState } from '../types';
import { createNativeOrbFrame } from './frame';
import type { NativeThinkingOrbProps } from './types';

const LABELS: Record<OrbState, string> = {
  working: 'Working…',
  searching: 'Searching…',
  solving: 'Solving…',
  listening: 'Listening…',
  composing: 'Composing…',
  shaping: 'Shaping…'
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

export function ThinkingOrb({
  state = 'working',
  size = 64,
  theme = 'auto',
  speed = 1,
  paused = false,
  frameRate = 30,
  density = 1,
  initialTime = 0.6,
  accessibilityLabel,
  style,
  ...rest
}: NativeThinkingOrbProps) {
  const systemScheme = useColorScheme();
  const reducedMotion = useReducedMotion();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const frozenTime = useRef(initialTime);
  const initialFrame = useMemo(
    () =>
      createNativeOrbFrame({
        state,
        size,
        time: frozenTime.current,
        dark:
          theme === 'dark' ||
          (theme === 'auto' && systemScheme !== 'light'),
        density
      }),
    []
  );
  const [circles, setCircles] = useState(initialFrame);

  const dark =
    theme === 'dark' || (theme === 'auto' && systemScheme !== 'light');
  const safeSize = Math.max(1, size);
  const safeFrameRate = Math.min(60, Math.max(1, frameRate));
  const safeDensity = Math.min(2, Math.max(0.1, density));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppActive(nextState === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const { speed: presetSpeed } = resolvePreset(
      state,
      safeSize < 40 ? 20 : 64
    );
    const shouldAnimate =
      !paused && !reducedMotion && appActive && speed !== 0;

    if (!shouldAnimate) {
      setCircles(
        createNativeOrbFrame({
          state,
          size: safeSize,
          time: frozenTime.current,
          dark,
          density: safeDensity
        })
      );
      return;
    }

    let animationFrame = 0;
    let lastPaint = 0;
    let lastTime = frozenTime.current;
    const startedAt = Date.now();
    const startedTime = frozenTime.current;
    const frameInterval = 1000 / safeFrameRate;

    const tick = () => {
      const now = Date.now();
      if (now - lastPaint >= frameInterval) {
        lastPaint = now;
        lastTime =
          startedTime +
          ((now - startedAt) / 1000) * presetSpeed * speed;
        setCircles(
          createNativeOrbFrame({
            state,
            size: safeSize,
            time: lastTime,
            dark,
            density: safeDensity
          })
        );
      }
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animationFrame);
      frozenTime.current = lastTime;
    };
  }, [
    appActive,
    dark,
    paused,
    reducedMotion,
    safeFrameRate,
    safeDensity,
    safeSize,
    speed,
    state
  ]);

  return (
    <View
      accessibilityLabel={accessibilityLabel ?? LABELS[state]}
      accessibilityRole="image"
      style={[{ width: safeSize, height: safeSize }, style]}
      {...rest}
    >
      {circles.map((circle, index) => (
        <View
          key={index}
          pointerEvents="none"
          style={[
            styles.circle,
            {
              left: circle.x - circle.radius,
              top: circle.y - circle.radius,
              width: circle.radius * 2,
              height: circle.radius * 2,
              borderRadius: circle.radius,
              backgroundColor: circle.color
            }
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    position: 'absolute'
  }
});
