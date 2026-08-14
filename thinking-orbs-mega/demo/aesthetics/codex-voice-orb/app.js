(function voiceOrbDemo() {
  "use strict";

  const {
    SpeakingActivityGate,
    VoiceOrb,
  } = window.CodexVoiceOrbArchive;

  const phaseLabels = {
    inactive: "未启动",
    starting: "正在连接",
    active: "活动中",
    stopping: "正在结束",
  };
  const activityLabels = {
    idle: "空闲中",
    listening: "聆听中",
    thinking: "思考中",
    speaking: "说话中",
  };

  const state = {
    activity: "listening",
    force2d: false,
    level: 0.35,
    mediaStream: null,
    microphoneActive: false,
    orb: null,
    phase: "active",
    previewTimeMs: null,
    speakingGate: null,
  };

  const phaseControl = document.querySelector("#phase-control");
  const activityControl = document.querySelector("#activity-control");
  const levelControl = document.querySelector("#level-control");
  const levelOutput = document.querySelector("#level-output");
  const timeControl = document.querySelector("#time-control");
  const timeOutput = document.querySelector("#time-output");
  const microphoneButton = document.querySelector("#microphone-button");
  const fallbackButton = document.querySelector("#fallback-button");
  const broadcastControl = document.querySelector("#broadcast-control");
  const inputNote = document.querySelector("#input-note");
  const errorMessage = document.querySelector("#error-message");
  const rendererBadge = document.querySelector("#renderer-badge");
  const statusText = document.querySelector("#live-status-text");

  function parseInitialState() {
    const params = new URLSearchParams(window.location.search);
    if (["inactive", "starting", "active", "stopping"].includes(params.get("phase"))) {
      state.phase = params.get("phase");
    }
    if (["idle", "listening", "thinking", "speaking"].includes(params.get("activity"))) {
      state.activity = params.get("activity");
    }
    if (params.has("level")) state.level = Math.max(0, Math.min(1, Number(params.get("level")) / 100));
    if (params.has("time")) state.previewTimeMs = Math.max(0, Number(params.get("time")));
    if (params.get("renderer") === "2d") state.force2d = true;
  }

  function setActiveButton(container, attribute, value) {
    for (const button of container.querySelectorAll(`button[${attribute}]`)) {
      button.classList.toggle("is-active", button.getAttribute(attribute) === value);
    }
  }

  function updateStatus() {
    statusText.textContent = state.phase === "active"
      ? activityLabels[state.activity]
      : phaseLabels[state.phase];
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = !message;
  }

  function rendererChanged(renderer, error) {
    rendererBadge.textContent = renderer === "webgl"
      ? "WebGL 1 · active"
      : renderer === "canvas2d"
        ? "Canvas 2D · fallback"
        : "renderer unavailable";
    if (error) showError(error.message);
  }

  function audioLevelsChanged(levels) {
    state.speakingGate?.update(levels.overall);
  }

  async function createOrb(force2d = state.force2d) {
    const oldOrb = state.orb;
    const oldCanvas = document.querySelector("#voice-orb");
    const canvas = oldCanvas.cloneNode(false);
    oldCanvas.replaceWith(canvas);
    if (oldOrb != null) await oldOrb.dispose();
    state.force2d = force2d;
    state.orb = new VoiceOrb(canvas, {
      broadcast: broadcastControl.checked,
      force2d,
      onAudioLevels: audioLevelsChanged,
      onRendererChange: rendererChanged,
    });
    state.orb.setState({ phase: state.phase, activity: state.activity });
    state.orb.setPreview({ level: state.level, timeMs: state.previewTimeMs });
    if (state.mediaStream != null) await state.orb.attachOutputStream(state.mediaStream);
    fallbackButton.textContent = force2d ? "切换至 WebGL" : "切换至 Canvas 2D";
    window.__voiceOrbArchive = {
      get orb() { return state.orb; },
      get state() { return { ...state, orb: undefined, speakingGate: undefined }; },
      setRenderer: createOrb,
    };
  }

  function applyState() {
    state.orb?.setState({ phase: state.phase, activity: state.activity });
    setActiveButton(phaseControl, "data-phase", state.phase);
    setActiveButton(activityControl, "data-activity", state.activity);
    updateStatus();
  }

  phaseControl.addEventListener("click", (event) => {
    const phase = event.target.closest("[data-phase]")?.dataset.phase;
    if (phase == null) return;
    state.phase = phase;
    applyState();
  });

  activityControl.addEventListener("click", (event) => {
    const activity = event.target.closest("[data-activity]")?.dataset.activity;
    if (activity == null) return;
    state.activity = activity;
    state.speakingGate && (state.speakingGate.activity = activity);
    applyState();
  });

  levelControl.addEventListener("input", () => {
    state.level = Number(levelControl.value) / 100;
    levelOutput.value = `${levelControl.value}%`;
    if (!state.microphoneActive) {
      state.orb?.setPreview({ level: state.level, timeMs: state.previewTimeMs });
    }
  });

  timeControl.addEventListener("input", () => {
    const value = Number(timeControl.value);
    state.previewTimeMs = value < 0 ? null : value;
    timeOutput.value = value < 0 ? "实时" : `${value} ms`;
    if (!state.microphoneActive) {
      state.orb?.setPreview({ level: state.level, timeMs: state.previewTimeMs });
    }
  });

  broadcastControl.addEventListener("change", () => {
    state.orb?.setBroadcastEnabled(broadcastControl.checked);
  });

  fallbackButton.addEventListener("click", async () => {
    showError("");
    await createOrb(!state.force2d);
  });

  microphoneButton.addEventListener("click", async () => {
    showError("");
    if (state.microphoneActive) {
      for (const track of state.mediaStream?.getTracks() ?? []) track.stop();
      state.mediaStream = null;
      state.microphoneActive = false;
      state.speakingGate?.dispose();
      state.speakingGate = null;
      await state.orb.attachOutputStream(null);
      state.orb.setPreview({ level: state.level, timeMs: state.previewTimeMs });
      microphoneButton.innerHTML = "<span aria-hidden=\"true\">◉</span> 使用麦克风测试";
      inputNote.textContent = "当前使用合成音频。原版分析 GPT/WebRTC 输出流；麦克风仅供此独立演示测试。";
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.mediaStream = stream;
      state.microphoneActive = true;
      state.previewTimeMs = null;
      timeControl.value = "-1";
      timeOutput.value = "实时";
      state.orb.setPreview({ level: state.level, timeMs: null });
      state.speakingGate = new SpeakingActivityGate((activity) => {
        state.activity = activity;
        applyState();
      }, state.activity);
      await state.orb.attachOutputStream(stream);
      microphoneButton.innerHTML = "<span aria-hidden=\"true\">■</span> 停止麦克风测试";
      inputNote.textContent = "当前由麦克风驱动，仅用于独立演示。Codex 原版圆球分析的是 GPT/WebRTC 输出流。";
    } catch (error) {
      showError(`无法启用麦克风：${error.message}`);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      state.orb?.stop();
    } else if (state.previewTimeMs == null && state.phase !== "inactive") {
      state.orb?.start();
    }
  });

  window.addEventListener("beforeunload", () => {
    for (const track of state.mediaStream?.getTracks() ?? []) track.stop();
    state.speakingGate?.dispose();
    state.orb?.dispose();
  });

  parseInitialState();
  levelControl.value = String(Math.round(state.level * 100));
  levelOutput.value = `${levelControl.value}%`;
  timeControl.value = state.previewTimeMs == null ? "-1" : String(state.previewTimeMs);
  timeOutput.value = state.previewTimeMs == null ? "实时" : `${state.previewTimeMs} ms`;
  applyState();
  createOrb(state.force2d).catch((error) => showError(error.message));
})();
