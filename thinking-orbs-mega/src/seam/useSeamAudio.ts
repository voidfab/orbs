import { useCallback, useEffect, useRef, useState } from 'react';
import { SeamAudio, type AudioLevels, type AudioStatus } from './audio';
import { SILENT_BUS } from './knobs';

export interface SeamAudioHandle {
  levels: AudioLevels;
  levelsRef: { current: AudioLevels };
  status: AudioStatus;
  statusRef: { current: AudioStatus };
  startMic: () => Promise<void>;
  startDemo: (channel?: 'out' | 'both') => Promise<void>;
  startSpeakers: () => Promise<void>;
  stopMic: () => void;
  stopOutput: () => void;
  stop: () => void;
}

const ZERO: AudioLevels = {
  input: 0,
  output: 0,
  vad: 0,
  in: { ...SILENT_BUS },
  out: { ...SILENT_BUS }
};
const IDLE: AudioStatus = { mic: false, output: 'none', error: null };

export function useSeamAudio(): SeamAudioHandle {
  const tap = useRef<SeamAudio | null>(null);
  if (!tap.current) tap.current = new SeamAudio();
  const levelsRef = useRef<AudioLevels>({ ...ZERO });
  const statusRef = useRef<AudioStatus>({ ...IDLE });
  const [levels, setLevels] = useState<AudioLevels>(ZERO);
  const [status, setStatus] = useState<AudioStatus>(IDLE);

  useEffect(() => {
    const audio = tap.current;
    if (!audio) return;
    let raf = 0;
    let lastPublish = 0;
    const loop = (now: number) => {
      const next = audio.poll(now);
      levelsRef.current = next;
      statusRef.current = audio.status;
      if (now - lastPublish > 40) {
        lastPublish = now;
        setLevels({
          input: next.input,
          output: next.output,
          vad: next.vad,
          in: { ...next.in },
          out: { ...next.out }
        });
        setStatus(audio.status);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      audio.stop();
    };
  }, []);

  const sync = () => {
    if (!tap.current) return;
    statusRef.current = tap.current.status;
    setStatus(tap.current.status);
  };

  const startMic = useCallback(async () => {
    try {
      await tap.current?.startMic();
    } catch {
      /* status.error is set */
    }
    sync();
  }, []);

  const startDemo = useCallback(async (channel: 'out' | 'both' = 'out') => {
    try {
      await tap.current?.startDemo(channel);
    } catch {
      /* status.error is set */
    }
    sync();
  }, []);

  const startSpeakers = useCallback(async () => {
    try {
      await tap.current?.startSpeakers();
    } catch {
      /* status.error is set */
    }
    sync();
  }, []);

  const stopMic = useCallback(() => {
    tap.current?.stopMic();
    sync();
  }, []);

  const stopOutput = useCallback(() => {
    tap.current?.stopOutput();
    sync();
  }, []);

  const stop = useCallback(() => {
    tap.current?.stop();
    sync();
  }, []);

  return {
    levels,
    levelsRef,
    status,
    statusRef,
    startMic,
    startDemo,
    startSpeakers,
    stopMic,
    stopOutput,
    stop
  };
}
