(function voiceOrbArchive(global) {
  "use strict";

  const PHASES = new Set(["inactive", "starting", "active", "stopping"]);
  const ACTIVITIES = new Set(["idle", "listening", "thinking", "speaking"]);
  const ZERO_LEVELS = Object.freeze({ low: 0, mid: 0, high: 0, overall: 0 });
  const BROADCAST_CHANNEL_NAME = "codex-realtime-voice-orb-audio";
  const FFT_BOUNDARIES = new Uint16Array([9, 96, 400]);
  const FFT_WEIGHTS = new Float32Array([10, 1, 1]);
  const SAMPLE_INTERVAL_MS = 1000 / 30;
  const SPEAKING_ENTER_THRESHOLD = 0.08;
  const SPEAKING_EXIT_THRESHOLD = 0.04;
  const SPEAKING_EXIT_DELAY_MS = 300;
  const MAX_DRAWABLE_RADIUS = 0.36;
  const MAX_HORIZONTAL_DRIFT = 0.0028;
  const MAX_VERTICAL_DRIFT = 0.0035;

  const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

  const FRAGMENT_SHADER = `
precision highp float;

varying vec2 v_uv;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_micLevel;
uniform float u_outputLevel;
uniform float u_stateListen;
uniform float u_stateThink;
uniform float u_stateSpeak;
uniform vec4 u_audio;
uniform vec4 u_cumulativeAudio;

#define PI 3.141592653589793
#define NUM_OCTAVES 5

float rand(vec2 n) {
  return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 ip = floor(p);
  vec2 u = fract(p);
  u = u * u * (3.0 - 2.0 * u);

  float res = mix(
    mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
    mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x),
    u.y
  );
  return res * res;
}

float fbm(vec2 x) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(100.0);
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < NUM_OCTAVES; i++) {
    v += a * noise(x);
    x = rot * x * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

vec3 blendLinearBurn(vec3 base, vec3 blend, float opacity) {
  vec3 burned = max(base + blend - vec3(1.0), vec3(0.0));
  return burned * opacity + base * (1.0 - opacity);
}

vec4 permute(vec4 x) {
  return mod((x * 34.0 + 1.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float cnoise(vec3 point) {
  vec3 cell0 = floor(point);
  vec3 cell1 = cell0 + vec3(1.0);
  cell0 = mod(cell0, 289.0);
  cell1 = mod(cell1, 289.0);
  vec3 offset0 = fract(point);
  vec3 offset1 = offset0 - vec3(1.0);
  vec4 x = vec4(cell0.x, cell1.x, cell0.x, cell1.x);
  vec4 y = vec4(cell0.yy, cell1.yy);
  vec4 z0 = vec4(cell0.z);
  vec4 z1 = vec4(cell1.z);
  vec4 xy = permute(permute(x) + y);
  vec4 xy0 = permute(xy + z0);
  vec4 xy1 = permute(xy + z1);

  vec4 gx0 = xy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(vec4(0.0), gx0) - 0.5);
  gy0 -= sz0 * (step(vec4(0.0), gy0) - 0.5);

  vec4 gx1 = xy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(vec4(0.0), gx1) - 0.5);
  gy1 -= sz1 * (step(vec4(0.0), gy1) - 0.5);

  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
  vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
  vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
  vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
  vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

  vec4 norm0 = taylorInvSqrt(
    vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110))
  );
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(
    vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111))
  );
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, offset0);
  float n100 = dot(g100, vec3(offset1.x, offset0.yz));
  float n010 = dot(g010, vec3(offset0.x, offset1.y, offset0.z));
  float n110 = dot(g110, vec3(offset1.xy, offset0.z));
  float n001 = dot(g001, vec3(offset0.xy, offset1.z));
  float n101 = dot(g101, vec3(offset1.x, offset0.y, offset1.z));
  float n011 = dot(g011, vec3(offset0.x, offset1.yz));
  float n111 = dot(g111, offset1);

  vec3 fadePoint = fade(offset0);
  vec4 noiseZ = mix(
    vec4(n000, n100, n010, n110),
    vec4(n001, n101, n011, n111),
    fadePoint.z
  );
  vec2 noiseYZ = mix(noiseZ.xy, noiseZ.zw, fadePoint.y);
  return 2.2 * mix(noiseYZ.x, noiseYZ.y, fadePoint.x);
}

void main() {
  vec2 st = v_uv - 0.5;
  st.x *= u_resolution.x / u_resolution.y;

  float sound = max(max(u_audio.x, u_audio.y), max(u_audio.z, u_audio.w));
  float stateAmount = max(u_stateListen, max(u_stateThink, u_stateSpeak));
  float thinking = u_stateThink;
  float audioEnergy = smoothstep(0.08, 0.72, max(sound, u_micLevel));
  float outputEnergy = smoothstep(0.04, 0.46, u_outputLevel);
  float breath = sin(u_time * PI * 0.34) * 0.5 + 0.5;
  float entry = smoothstep(0.0, 0.9, stateAmount);
  float maxDrawableRadius = min(0.36, min(0.5, 0.5 * u_resolution.x / u_resolution.y) - 0.16);
  float baseRadius = mix(maxDrawableRadius * 0.88, maxDrawableRadius * 0.94, thinking);
  float radius = baseRadius * mix(0.82, 1.0, entry);
  float outputExpansion = outputEnergy * maxDrawableRadius * 0.12;
  float restingBreath =
    (1.0 - thinking) *
    (1.0 - outputEnergy) *
    breath *
    maxDrawableRadius *
    0.01;
  radius = min(maxDrawableRadius, radius + outputExpansion + restingBreath);

  float horizontalDrift = sin(u_time * 0.43) * 0.0028;
  float verticalDrift = sin(u_time * 0.36 + 1.7) * 0.0035;
  vec2 lifted = st - vec2(horizontalDrift, verticalDrift);
  float dist = length(lifted) - radius;
  float edgeWidth = max(1.25 / min(u_resolution.x, u_resolution.y), 0.0014);
  if (dist > edgeWidth) {
    discard;
  }
  float edge = 1.0 - smoothstep(-edgeWidth, edgeWidth, dist);

  vec2 uv = lifted / (2.0 * radius) + 0.5;
  float overallSoundScale = 1.0 + audioEnergy * 0.22;
  float time = u_time * 0.34;
  float noiseX = cnoise(vec3(
    uv + vec2(0.0, 74.8572),
    (time + u_cumulativeAudio.x * 0.05 * overallSoundScale) * 0.3
  ));
  float noiseY = cnoise(vec3(
    uv + vec2(203.91282, 10.0),
    (time + u_cumulativeAudio.z * 0.05 * overallSoundScale) * 0.3
  ));
  uv += vec2(noiseX * 2.0, noiseY) * 0.19;
  float voiceWarpX = cnoise(vec3(
    uv * 3.1 + vec2(0.0, 17.3),
    u_cumulativeAudio.x * 0.085 + u_cumulativeAudio.z * 0.035
  ));
  float voiceWarpY = cnoise(vec3(
    uv * 3.4 + vec2(31.7, 0.0),
    u_cumulativeAudio.y * 0.075 + u_cumulativeAudio.w * 0.045
  ));
  uv += vec2(voiceWarpX, voiceWarpY) * audioEnergy * 0.04;
  uv.y +=
    sin(uv.x * 5.4 + u_cumulativeAudio.w * 0.19) *
    audioEnergy *
    0.016;
  float watercolorNoise =
    cnoise(vec3(uv * 18.0 + vec2(344.91282, 0.0), time * 0.3)) +
    cnoise(vec3(uv * 39.6 + vec2(723.937, 0.0), time * 0.4)) * 0.5;
  uv += watercolorNoise * 0.006;
  float textureNoiseA = noise(
    uv * 22.0 + vec2(time * 0.08, u_cumulativeAudio.x * 0.025)
  );
  float textureNoiseB = noise(
    vec2(1.0 - uv.x, uv.y) * 41.0 +
    vec2(u_cumulativeAudio.z * 0.018, -time * 0.11)
  );
  float textureDisplacement =
    mix(
      textureNoiseA,
      textureNoiseB,
      sin(time + u_cumulativeAudio.w * 0.12) * 0.5 + 0.5
    ) -
    0.5;
  uv += textureDisplacement * (0.012 + audioEnergy * 0.004);
  uv.y = 1.0 - uv.y;
  vec2 rotatedUv = uv - 0.5;
  float gradientAngle = -0.16;
  uv = mat2(
    cos(gradientAngle), -sin(gradientAngle),
    sin(gradientAngle), cos(gradientAngle)
  ) * rotatedUv + 0.5;
  uv.y -= 0.03;

  vec2 stNoise = uv * 1.25;
  vec2 q = vec2(0.0);
  q.x = fbm(
    stNoise * 0.5 +
    0.075 * (time + u_cumulativeAudio.w * 0.175 * overallSoundScale)
  );
  q.y = fbm(
    stNoise * 0.5 +
    0.075 * (time + u_cumulativeAudio.x * 0.136 * overallSoundScale)
  );
  vec2 r = vec2(
    fbm(
      stNoise +
      q +
      vec2(0.3, 9.2) +
      0.15 * (time + u_cumulativeAudio.y * 0.234 * overallSoundScale)
    ),
    fbm(
      stNoise +
      q +
      vec2(8.3, 0.8) +
      0.126 * (time + u_cumulativeAudio.z * 0.165 * overallSoundScale)
    )
  );
  float f = fbm(stNoise + r - q);
  float fullFbm = pow(((f + 0.6 * f * f + 0.7 * f) + 0.5) * 0.5, 0.55);

  vec3 mainColor = mix(vec3(0.94, 0.965, 1.0), vec3(1.0, 0.99, 0.96), u_micLevel);
  vec3 lowColor = vec3(0.36, 0.34, 0.96);
  vec3 midColor = mix(vec3(0.57, 0.64, 1.0), vec3(0.96, 0.92, 1.0), u_micLevel);
  vec3 highColor = vec3(1.0, 0.99, 0.97);

  vec3 sinOffsets = vec3(
    u_cumulativeAudio.x * 0.15 * overallSoundScale,
    -u_cumulativeAudio.y * 0.5 * overallSoundScale,
    u_cumulativeAudio.z * 1.5 * overallSoundScale
  );

  vec2 snUv = uv + vec2((fullFbm - 0.5) * 1.2, 0.025);
  float sn = noise(snUv * 2.0 + vec2(sin(sinOffsets.x * 0.25), time * 0.5 + sinOffsets.x)) * 2.0;
  float sn2 = smoothstep(
    sn - 1.8,
    sn + 1.8,
    ((snUv.y - 0.5) * (5.0 - u_audio.x * 0.05 * overallSoundScale)) + 0.5
  );

  vec2 snUvBis = uv + vec2((fullFbm - 0.5) * 0.85, 0.025);
  float snBis = noise(snUvBis * 4.0 + vec2(sin(sinOffsets.y * 0.15) * 2.4 + 293.0, time + sinOffsets.y * 0.5)) * 2.0;
  float sn2Bis = smoothstep(
    snBis - ((0.9 + u_audio.y * 0.4) * 1.5),
    snBis + ((0.9 + u_audio.y * 0.8) * 1.5),
    ((snUvBis.y - 0.6) * (5.0 - u_audio.y * 0.75)) + 0.5
  );

  vec2 snUvThird = uv + vec2((fullFbm - 0.5) * 1.1);
  float snThird = noise(snUvThird * 6.0 + vec2(sin(sinOffsets.z * 0.1) * 2.4 + 153.0, time * 1.2 + sinOffsets.z * 0.8)) * 2.0;
  float sn2Third = smoothstep(
    snThird - 1.05,
    snThird + 1.05,
    ((snUvThird.y - 0.9) * 6.0) + 0.5
  );

  sn2 = pow(sn2, 0.8);
  sn2Bis = pow(sn2Bis, 0.9);

  vec3 color = blendLinearBurn(mainColor, lowColor, 1.0 - sn2);
  color = blendLinearBurn(color, mix(mainColor, midColor, 1.0 - sn2Bis), sn2);
  color = mix(color, mix(mainColor, highColor, 1.0 - sn2Third), sn2 * sn2Bis);
  float fineColorNoise = fbm(
    uv * 12.0 + vec2(time * 0.13, -time * 0.09) + r * 0.4
  );
  color = mix(
    color,
    highColor,
    smoothstep(0.58, 0.9, fineColorNoise) * (0.035 + audioEnergy * 0.025)
  );
  color = mix(
    color,
    lowColor,
    smoothstep(0.42, 0.12, fineColorNoise) * 0.018
  );

  float orbAlpha = edge * smoothstep(0.0, 0.18, stateAmount + 0.3);
  gl_FragColor = vec4(color, orbAlpha);
}
`;

  const QUAD_VERTICES = new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1,
  ]);

  function clamp(value, minimum = 0, maximum = 1) {
    return Math.max(minimum, Math.min(maximum, Number(value) || 0));
  }

  function normalizeLevels(levels) {
    if (levels == null) return { ...ZERO_LEVELS };
    return {
      low: clamp(levels.low),
      mid: clamp(levels.mid),
      high: clamp(levels.high),
      overall: clamp(levels.overall),
    };
  }

  function medianFrequencyEnergy(frequencyData, start, end) {
    const values = [];
    for (let index = start; index < end; index += 1) {
      const decibels = Math.max(-100, Math.min(-10, frequencyData[index] ?? -100));
      values.push(Math.sqrt(1 - Math.abs(decibels) / 100));
    }
    values.sort((left, right) => left - right);
    const middle = Math.floor(values.length / 2);
    return values.length % 2 === 0
      ? ((values[middle - 1] ?? 0) + (values[middle] ?? 0)) / 2
      : values[middle] ?? 0;
  }

  function extractFrequencyLevels(frequencyData) {
    const bands = [0, 0, 0];
    let start = 0;
    for (let index = 0; index < FFT_BOUNDARIES.length; index += 1) {
      const end = FFT_BOUNDARIES[index];
      const weighted = medianFrequencyEnergy(frequencyData, start, end) * FFT_WEIGHTS[index];
      bands[index] = weighted / (weighted + 1);
      start = end;
    }
    const overallEnergy = medianFrequencyEnergy(frequencyData, 0, 400);
    return {
      high: bands[2] ?? 0,
      low: bands[0] ?? 0,
      mid: bands[1] ?? 0,
      overall: overallEnergy / (overallEnergy + 1),
    };
  }

  function stateTargets(phase, activity) {
    if (phase === "inactive") return { listen: 0, speak: 0, think: 0 };
    if (phase === "starting") return { listen: 0, speak: 0, think: 1 };
    if (phase === "stopping") return { listen: 0.35, speak: 0, think: 0 };
    if (activity === "thinking") return { listen: 0.65, speak: 0, think: 1 };
    if (activity === "speaking") return { listen: 0.2, speak: 1, think: 0 };
    return { listen: 1, speak: 0, think: 0 };
  }

  function smoothstep(minimum, maximum, value) {
    const normalized = clamp((value - minimum) / (maximum - minimum));
    return normalized * normalized * (3 - 2 * normalized);
  }

  function simulatedAudio(activity, previewLevel, hasFixedTime, timeSeconds) {
    const level = Math.max(hasFixedTime && activity === "speaking" ? 0.42 : 0, clamp(previewLevel));
    const envelope = smoothstep(0.08, 0.72, Math.sin(timeSeconds * 0.78) * 0.5 + 0.5);
    const pulse = 0.58
      + Math.sin(timeSeconds * 3.1 + 0.6) * 0.17
      + Math.sin(timeSeconds * 4.2 + 2.1) * 0.12;
    const speaking = activity === "speaking"
      ? level * (0.08 + envelope * Math.max(0.24, pulse))
      : 0;
    const thinking = activity === "thinking"
      ? level * (0.1 + (Math.sin(timeSeconds * 1.4) * 0.5 + 0.5) * 0.06)
      : 0;
    const listening = activity === "listening" ? level * 0.08 : 0;
    const total = Math.min(1, Math.max(speaking, thinking, listening));
    return new Float32Array([
      total * (0.82 + Math.sin(timeSeconds * 1.1) * 0.14),
      total * (0.76 + Math.sin(timeSeconds * 1.5 + 1.2) * 0.16),
      total * (0.68 + Math.sin(timeSeconds * 1.9 + 2.1) * 0.18),
      total,
    ]);
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (shader == null) throw new Error("Unable to create voice orb shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const detail = gl.getShaderInfoLog(shader) || "unknown compile error";
      gl.deleteShader(shader);
      throw new Error(`Unable to compile voice orb shader: ${detail}`);
    }
    return shader;
  }

  function requiredUniform(gl, program, name) {
    const location = gl.getUniformLocation(program, name);
    if (location == null) throw new Error(`Voice orb shader is missing ${name}`);
    return location;
  }

  class OutputAudioAnalyser {
    constructor(publish) {
      this.publish = publish;
      this.analyser = null;
      this.audioContext = null;
      this.audioSource = null;
      this.audioStream = null;
      this.frequencyData = new Float32Array();
      this.sampleIntervalId = null;
      this.sample = this.sample.bind(this);
    }

    async setStream(stream) {
      if (this.audioStream === stream) {
        await this.audioContext?.resume().catch(() => {});
        return;
      }
      const hadStream = this.audioStream != null;
      this.audioSource?.disconnect();
      this.audioSource = null;
      this.audioStream = stream;
      const AudioContextClass = global.AudioContext || global.webkitAudioContext;
      if (stream == null || AudioContextClass == null) {
        if (this.sampleIntervalId != null) {
          global.clearInterval(this.sampleIntervalId);
          this.sampleIntervalId = null;
        }
        if (hadStream) this.publish({ ...ZERO_LEVELS });
        return;
      }
      const context = this.audioContext ?? new AudioContextClass();
      const analyser = this.analyser ?? context.createAnalyser();
      if (this.analyser == null) {
        analyser.fftSize = 2048;
        analyser.minDecibels = -100;
        analyser.maxDecibels = -10;
        analyser.smoothingTimeConstant = 0.86;
        this.analyser = analyser;
        this.frequencyData = new Float32Array(analyser.frequencyBinCount);
      }
      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);
      this.audioContext = context;
      this.audioSource = source;
      await context.resume().catch(() => {});
      this.sampleIntervalId ??= global.setInterval(this.sample, SAMPLE_INTERVAL_MS);
    }

    sample() {
      if (this.analyser == null || this.audioStream == null) return;
      this.analyser.getFloatFrequencyData(this.frequencyData);
      this.publish(extractFrequencyLevels(this.frequencyData));
    }

    async dispose() {
      await this.setStream(null);
      await this.audioContext?.close().catch(() => {});
      this.audioContext = null;
      this.analyser = null;
      this.frequencyData = new Float32Array();
    }
  }

  class SpeakingActivityGate {
    constructor(onActivity, initialActivity = "listening") {
      this.onActivity = onActivity;
      this.activity = initialActivity;
      this.exitTimer = null;
    }

    update(overall) {
      const level = clamp(overall);
      if (level >= SPEAKING_ENTER_THRESHOLD) {
        this.cancelExit();
        if (this.activity !== "speaking") {
          this.activity = "speaking";
          this.onActivity(this.activity);
        }
        return;
      }
      if (level > SPEAKING_EXIT_THRESHOLD || this.activity !== "speaking" || this.exitTimer != null) {
        return;
      }
      this.exitTimer = global.setTimeout(() => {
        this.exitTimer = null;
        this.activity = "listening";
        this.onActivity(this.activity);
      }, SPEAKING_EXIT_DELAY_MS);
    }

    cancelExit() {
      if (this.exitTimer == null) return;
      global.clearTimeout(this.exitTimer);
      this.exitTimer = null;
    }

    dispose() {
      this.cancelExit();
    }
  }

  class VoiceOrb {
    constructor(canvas, options = {}) {
      if (canvas == null || typeof canvas.getContext !== "function") {
        throw new TypeError("VoiceOrb requires a canvas element");
      }
      this.canvas = canvas;
      this.options = {
        broadcast: options.broadcast !== false,
        force2d: options.force2d === true,
        glowEnabled: options.glowEnabled !== false,
        onAudioLevels: options.onAudioLevels,
        onRendererChange: options.onRendererChange,
      };
      this.phase = "inactive";
      this.activity = "idle";
      this.previewLevel = 0;
      this.previewTimeMs = null;
      this.hasInputs = false;
      this.disposed = false;
      this.animationFrameId = null;
      this.lastFrameTime = 0;
      this.audioData = new Float32Array(4);
      this.cumulativeAudioData = new Float32Array(4);
      this.publishedAudioLevels = null;
      this.micLevel = 0;
      this.outputLevel = 0;
      this.stateListen = 0;
      this.stateThink = 0;
      this.stateSpeak = 0;
      this.gl = null;
      this.canvasContext = null;
      this.program = null;
      this.positionBuffer = null;
      this.uniforms = null;
      this.renderer = "uninitialized";
      this.broadcastChannel = null;
      this.resizeObserver = null;
      this.canvasSizeDirty = true;
      this.pixelRatio = 0;
      this.resolutionDirty = true;
      this.scissorRect = null;
      this.renderFrame = this.renderFrame.bind(this);
      this.audioAnalyser = new OutputAudioAnalyser((levels) => {
        this.setAudioLevels(levels, { broadcast: true });
        this.options.onAudioLevels?.(levels);
      });
      if (this.options.glowEnabled) {
        this.canvas.style.filter = "drop-shadow(0 0 4px rgb(154 154 249 / 55%))";
      }
      this.observeCanvasSize();
      this.initializeRenderer();
      this.setBroadcastEnabled(this.options.broadcast);
    }

    observeCanvasSize() {
      if (typeof global.ResizeObserver !== "function") return;
      this.resizeObserver = new global.ResizeObserver(() => {
        this.canvasSizeDirty = true;
      });
      this.resizeObserver.observe(this.canvas);
    }

    initializeRenderer() {
      if (this.options.force2d) {
        this.canvasContext = this.canvas.getContext("2d");
        this.setRenderer("canvas2d");
        return;
      }
      this.gl = this.canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        premultipliedAlpha: false,
      });
      if (this.gl == null) {
        this.canvasContext = this.canvas.getContext("2d");
        this.setRenderer("canvas2d");
        return;
      }
      try {
        this.createProgram(this.gl);
        this.setRenderer("webgl");
      } catch (error) {
        this.gl = null;
        this.program = null;
        this.uniforms = null;
        this.canvasContext = this.canvas.getContext("2d");
        this.setRenderer(this.canvasContext == null ? "unavailable" : "canvas2d");
        this.rendererError = error;
      }
    }

    setRenderer(renderer) {
      this.renderer = renderer;
      this.options.onRendererChange?.(renderer, this.rendererError ?? null);
    }

    createProgram(gl) {
      const program = gl.createProgram();
      if (program == null) throw new Error("Unable to create voice orb program");
      const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
      const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const detail = gl.getProgramInfoLog(program) || "unknown link error";
        gl.deleteProgram(program);
        throw new Error(`Unable to link voice orb program: ${detail}`);
      }
      const position = gl.getAttribLocation(program, "a_position");
      const buffer = gl.createBuffer();
      if (buffer == null) {
        gl.deleteProgram(program);
        throw new Error("Unable to create voice orb vertex buffer");
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);
      gl.useProgram(program);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.SCISSOR_TEST);
      gl.clearColor(0, 0, 0, 0);
      this.program = program;
      this.positionBuffer = buffer;
      try {
        this.uniforms = {
          audio: requiredUniform(gl, program, "u_audio"),
          cumulativeAudio: requiredUniform(gl, program, "u_cumulativeAudio"),
          micLevel: requiredUniform(gl, program, "u_micLevel"),
          outputLevel: requiredUniform(gl, program, "u_outputLevel"),
          resolution: requiredUniform(gl, program, "u_resolution"),
          stateListen: requiredUniform(gl, program, "u_stateListen"),
          stateSpeak: requiredUniform(gl, program, "u_stateSpeak"),
          stateThink: requiredUniform(gl, program, "u_stateThink"),
          time: requiredUniform(gl, program, "u_time"),
        };
      } catch (error) {
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        this.positionBuffer = null;
        this.program = null;
        throw error;
      }
    }

    setState({ phase = this.phase, activity = this.activity }) {
      if (!PHASES.has(phase)) throw new RangeError(`Unknown voice phase: ${phase}`);
      if (!ACTIVITIES.has(activity)) throw new RangeError(`Unknown voice activity: ${activity}`);
      this.phase = phase;
      this.activity = activity;
      if (!this.hasInputs) {
        const targets = stateTargets(phase, activity);
        this.stateListen = targets.listen;
        this.stateThink = targets.think;
        this.stateSpeak = targets.speak;
        this.hasInputs = true;
      }
      if (phase === "inactive" || this.previewTimeMs != null) {
        this.stop();
        this.render((this.previewTimeMs ?? performance.now()) / 1000);
      } else {
        this.start();
      }
      return this;
    }

    setAudioLevels(levels, options = {}) {
      const normalized = normalizeLevels(levels);
      this.publishedAudioLevels = normalized;
      if (options.broadcast !== false && this.broadcastChannel != null) {
        this.broadcastChannel.postMessage(normalized);
      }
      return this;
    }

    clearAudioLevels(options = {}) {
      this.publishedAudioLevels = null;
      if (options.broadcast === true && this.broadcastChannel != null) {
        this.broadcastChannel.postMessage(null);
      }
      return this;
    }

    setPreview({ level = this.previewLevel, timeMs = this.previewTimeMs } = {}) {
      this.previewLevel = clamp(level);
      this.previewTimeMs = Number.isFinite(timeMs) ? Math.max(0, Number(timeMs)) : null;
      this.publishedAudioLevels = null;
      if (this.previewTimeMs == null && this.phase !== "inactive") {
        this.start();
      } else {
        this.stop();
        this.render((this.previewTimeMs ?? performance.now()) / 1000);
      }
      return this;
    }

    async attachOutputStream(mediaStream) {
      if (this.disposed) throw new Error("VoiceOrb has been disposed");
      await this.audioAnalyser.setStream(mediaStream);
      if (mediaStream == null) this.clearAudioLevels({ broadcast: true });
      return this;
    }

    setBroadcastEnabled(enabled) {
      const shouldEnable = Boolean(enabled);
      this.options.broadcast = shouldEnable;
      if (!shouldEnable) {
        this.broadcastChannel?.close();
        this.broadcastChannel = null;
        return this;
      }
      if (this.broadcastChannel == null && typeof global.BroadcastChannel === "function") {
        this.broadcastChannel = new global.BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.addEventListener("message", (event) => {
          if (event.data == null) {
            this.publishedAudioLevels = null;
          } else {
            this.setAudioLevels(event.data, { broadcast: false });
          }
        });
      }
      return this;
    }

    start() {
      if (this.disposed || this.previewTimeMs != null || this.animationFrameId != null) {
        return this;
      }
      this.lastFrameTime = performance.now() / 1000;
      this.animationFrameId = global.requestAnimationFrame(this.renderFrame);
      return this;
    }

    stop() {
      if (this.animationFrameId != null) {
        global.cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      return this;
    }

    renderFrame(milliseconds) {
      this.animationFrameId = null;
      this.render(milliseconds / 1000);
      if (!this.disposed && this.previewTimeMs == null && this.phase !== "inactive") {
        this.animationFrameId = global.requestAnimationFrame(this.renderFrame);
      }
    }

    render(timeSeconds) {
      if (this.disposed) return;
      const delta = this.lastFrameTime === 0 || this.previewTimeMs != null
        ? 0.016
        : Math.max(0, Math.min(0.05, timeSeconds - this.lastFrameTime));
      this.lastFrameTime = timeSeconds;
      this.updateState(delta);
      this.updateAudio(delta, timeSeconds);
      this.resizeCanvas();
      if (this.gl == null || this.program == null || this.uniforms == null) {
        this.renderCanvasFallback(timeSeconds);
        return;
      }
      const gl = this.gl;
      gl.useProgram(this.program);
      if (this.resolutionDirty) {
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.scissor(
          this.scissorRect.x,
          this.scissorRect.y,
          this.scissorRect.width,
          this.scissorRect.height,
        );
        gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
        this.resolutionDirty = false;
      }
      gl.disable(gl.SCISSOR_TEST);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.SCISSOR_TEST);
      gl.uniform1f(this.uniforms.time, timeSeconds);
      gl.uniform1f(this.uniforms.micLevel, this.micLevel);
      gl.uniform1f(this.uniforms.outputLevel, this.outputLevel);
      gl.uniform1f(this.uniforms.stateListen, this.stateListen);
      gl.uniform1f(this.uniforms.stateThink, this.stateThink);
      gl.uniform1f(this.uniforms.stateSpeak, this.stateSpeak);
      gl.uniform4fv(this.uniforms.audio, this.audioData);
      gl.uniform4fv(this.uniforms.cumulativeAudio, this.cumulativeAudioData);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    resizeCanvas() {
      const ratio = Math.min(global.devicePixelRatio || 1, 1.5);
      if (
        this.resizeObserver != null
        && !this.canvasSizeDirty
        && ratio === this.pixelRatio
      ) {
        return false;
      }
      const width = Math.max(1, Math.round(this.canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(this.canvas.clientHeight * ratio));
      const changed = this.canvas.width !== width || this.canvas.height !== height;
      if (this.canvas.width !== width) this.canvas.width = width;
      if (this.canvas.height !== height) this.canvas.height = height;
      this.canvasSizeDirty = false;
      this.pixelRatio = ratio;
      if (changed || this.scissorRect == null) {
        this.scissorRect = this.calculateScissorRect(width, height);
        this.resolutionDirty = true;
      }
      return changed;
    }

    calculateScissorRect(width, height) {
      const aspect = width / height;
      const maxRadius = Math.min(
        MAX_DRAWABLE_RADIUS,
        Math.min(0.5, 0.5 * aspect) - 0.16,
      );
      if (maxRadius <= 0) {
        return { x: 0, y: 0, width, height };
      }
      const edgeWidth = Math.max(1.25 / Math.min(width, height), 0.0014);
      const halfWidth = Math.ceil(
        (maxRadius + MAX_HORIZONTAL_DRIFT + edgeWidth) * height,
      ) + 2;
      const halfHeight = Math.ceil(
        (maxRadius + MAX_VERTICAL_DRIFT + edgeWidth) * height,
      ) + 2;
      const left = Math.max(0, Math.floor(width / 2 - halfWidth));
      const right = Math.min(width, Math.ceil(width / 2 + halfWidth));
      const bottom = Math.max(0, Math.floor(height / 2 - halfHeight));
      const top = Math.min(height, Math.ceil(height / 2 + halfHeight));
      return {
        x: left,
        y: bottom,
        width: Math.max(1, right - left),
        height: Math.max(1, top - bottom),
      };
    }

    updateState(delta) {
      const targets = stateTargets(this.phase, this.activity);
      const smoothing = this.previewTimeMs == null ? 1 - Math.exp(-delta / 0.28) : 1;
      this.stateListen += (targets.listen - this.stateListen) * smoothing;
      this.stateThink += (targets.think - this.stateThink) * smoothing;
      this.stateSpeak += (targets.speak - this.stateSpeak) * smoothing;
      if (this.phase === "starting") this.stateThink = Math.max(this.stateThink, 0.6);
    }

    updateAudio(delta, timeSeconds) {
      const published = this.publishedAudioLevels;
      if (published != null) {
        const levels = [published.low, published.mid, published.high, published.overall];
        const frameScale = delta * 60;
        const accumulationSmoothing = 1 - Math.exp(-delta / 2);
        for (let index = 0; index < this.audioData.length; index += 1) {
          const target = levels[index] * frameScale;
          this.audioData[index] += (target - this.audioData[index]) * accumulationSmoothing;
          this.cumulativeAudioData[index] += levels[index] * frameScale * 40 * accumulationSmoothing;
        }
        const peak = Math.max(...levels);
        const micSmoothing = 1 - Math.exp(-delta / (peak > this.micLevel ? 0.12 : 0.32));
        this.micLevel += (peak - this.micLevel) * micSmoothing;
        const outputSmoothing = 1 - Math.exp(
          -delta / (published.overall > this.outputLevel ? 0.09 : 0.3),
        );
        this.outputLevel += (published.overall - this.outputLevel) * outputSmoothing;
        return;
      }

      const synthetic = simulatedAudio(
        this.activity,
        this.previewLevel,
        this.previewTimeMs != null,
        timeSeconds,
      );
      if (this.previewTimeMs != null) {
        for (let index = 0; index < this.audioData.length; index += 1) {
          this.audioData[index] = synthetic[index];
          this.cumulativeAudioData[index] = synthetic[index] * timeSeconds * 2.5;
        }
        this.micLevel = synthetic[3];
        this.outputLevel = synthetic[3];
        return;
      }
      for (let index = 0; index < this.audioData.length; index += 1) {
        const smoothing = 1 - Math.exp(
          -delta / (synthetic[index] > this.audioData[index] ? 0.24 : 0.72),
        );
        this.audioData[index] += (synthetic[index] - this.audioData[index]) * smoothing;
        const rate = this.activity === "speaking" ? 7 : 3.5;
        this.cumulativeAudioData[index] += this.audioData[index] * delta * rate;
      }
      const micSmoothing = 1 - Math.exp(
        -delta / (synthetic[3] > this.micLevel ? 0.26 : 0.8),
      );
      this.micLevel += (synthetic[3] - this.micLevel) * micSmoothing;
      const outputTarget = this.previewLevel > 0 ? synthetic[3] : 0;
      const outputSmoothing = 1 - Math.exp(
        -delta / (outputTarget > this.outputLevel ? 0.09 : 0.3),
      );
      this.outputLevel += (outputTarget - this.outputLevel) * outputSmoothing;
    }

    renderCanvasFallback(timeSeconds) {
      const context = this.canvasContext;
      if (context == null) return;
      const radius = Math.min(this.canvas.width, this.canvas.height) * 0.29;
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2 + Math.sin(timeSeconds * 0.36) * 1.5;
      context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const gradient = context.createLinearGradient(
        centerX - radius * 0.7,
        centerY - radius,
        centerX + radius * 0.55,
        centerY + radius,
      );
      gradient.addColorStop(0, "rgba(1, 129, 254, 1)");
      gradient.addColorStop(0.46, "rgba(164, 239, 255, 0.98)");
      gradient.addColorStop(1, "rgba(255, 253, 239, 0.98)");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(centerX, centerY, radius * (1 + this.outputLevel * 0.12), 0, Math.PI * 2);
      context.fill();
    }

    getDiagnostics() {
      return {
        activity: this.activity,
        animationFrameActive: this.animationFrameId != null,
        audioContextState: this.audioAnalyser.audioContext?.state ?? null,
        broadcastActive: this.broadcastChannel != null,
        canvasHeight: this.canvas.height,
        canvasWidth: this.canvas.width,
        disposed: this.disposed,
        phase: this.phase,
        previewTimeMs: this.previewTimeMs,
        renderer: this.renderer,
        sampleTimerActive: this.audioAnalyser.sampleIntervalId != null,
        stateListen: this.stateListen,
        stateSpeak: this.stateSpeak,
        stateThink: this.stateThink,
      };
    }

    async dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.stop();
      this.broadcastChannel?.close();
      this.broadcastChannel = null;
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      await this.audioAnalyser.dispose();
      if (this.gl != null && this.positionBuffer != null) {
        this.gl.deleteBuffer(this.positionBuffer);
      }
      if (this.gl != null && this.program != null) this.gl.deleteProgram(this.program);
      this.positionBuffer = null;
      this.program = null;
      this.uniforms = null;
    }
  }

  const api = Object.freeze({
    ACTIVITIES: Object.freeze([...ACTIVITIES]),
    BROADCAST_CHANNEL_NAME,
    FFT_BOUNDARIES,
    FFT_WEIGHTS,
    FRAGMENT_SHADER,
    OutputAudioAnalyser,
    PHASES: Object.freeze([...PHASES]),
    SAMPLE_INTERVAL_MS,
    SPEAKING_ENTER_THRESHOLD,
    SPEAKING_EXIT_DELAY_MS,
    SPEAKING_EXIT_THRESHOLD,
    SpeakingActivityGate,
    VERTEX_SHADER,
    VoiceOrb,
    extractFrequencyLevels,
    medianFrequencyEnergy,
    normalizeLevels,
    simulatedAudio,
    stateTargets,
  });

  global.CodexVoiceOrbArchive = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
