"use strict";

(function initSfxGlobal() {
  const STORAGE_KEY = "soloLevelingSfxEnabled";
  const PRESET_KEY = "soloLevelingSfxPreset";
  const BGM_UNLOCKED_KEY = "soloLevelingBgmUnlocked";
  const BGM_STATE_KEY = "soloLevelingBgmState";
  const BGM_PATH = "assets/audio/bgm-main.mp3";
  const STATUS_OPEN_PATH = "assets/audio/status-open.mp3";
  const RANKUP_SAMPLE_PATH = "assets/audio/rankup-special.mp3";
  const PENALTY_SAMPLE_PATH = "assets/audio/penalty-hit.mp3";
  const canPlayBgm = window.self === window.top;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const enabled = localStorage.getItem(STORAGE_KEY) !== "0";
  const DEFAULT_PRESET = "cinematic";
  let ctx = null;
  let lastHoverAt = 0;
  let lastTypeAt = 0;
  let lastStatusOpenAt = 0;
  let lastRankupAt = 0;
  let lastPenaltyAt = 0;
  let currentPresetName = localStorage.getItem(PRESET_KEY) || DEFAULT_PRESET;
  let bgmStarted = false;
  let bgmPersistTimer = null;
  let pendingBgmSeek = null;

  const bgmAudio = canPlayBgm && typeof Audio !== "undefined" ? new Audio(BGM_PATH) : null;
  const statusOpenAudio = typeof Audio !== "undefined" ? new Audio(STATUS_OPEN_PATH) : null;
  const rankupSampleAudio = typeof Audio !== "undefined" ? new Audio(RANKUP_SAMPLE_PATH) : null;
  const penaltySampleAudio = typeof Audio !== "undefined" ? new Audio(PENALTY_SAMPLE_PATH) : null;

  if (bgmAudio) {
    bgmAudio.loop = true;
    bgmAudio.preload = "auto";
    bgmAudio.volume = 0.26;
  }

  if (statusOpenAudio) {
    statusOpenAudio.preload = "auto";
    statusOpenAudio.volume = 0.85;
  }

  if (rankupSampleAudio) {
    rankupSampleAudio.preload = "auto";
    rankupSampleAudio.volume = 0.86;
  }

  if (penaltySampleAudio) {
    penaltySampleAudio.preload = "auto";
    penaltySampleAudio.volume = 0.9;
  }

  function postToTop(type) {
    if (window.top && window.top !== window.self) {
      try {
        window.top.postMessage({ type }, window.location.origin);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  function readBgmState() {
    const raw = localStorage.getItem(BGM_STATE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.time !== "number") return null;
      if (typeof parsed.ts !== "number") return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function normalizeBgmTime(time) {
    if (!bgmAudio) return 0;
    const duration = Number.isFinite(bgmAudio.duration) ? bgmAudio.duration : 0;
    if (duration > 0) {
      return ((time % duration) + duration) % duration;
    }
    return Math.max(0, time);
  }

  function saveBgmState() {
    if (!bgmAudio) return;
    localStorage.setItem(BGM_STATE_KEY, JSON.stringify({
      time: bgmAudio.currentTime || 0,
      ts: Date.now()
    }));
  }

  function applyPendingBgmSeek() {
    if (!bgmAudio || pendingBgmSeek === null) return;
    if (bgmAudio.readyState < 1) return;
    try {
      bgmAudio.currentTime = normalizeBgmTime(pendingBgmSeek);
      pendingBgmSeek = null;
    } catch {
      // Wait for metadata to be ready and try again.
    }
  }

  function startBgmPersist() {
    if (bgmPersistTimer !== null) return;
    bgmPersistTimer = window.setInterval(() => {
      saveBgmState();
    }, 1000);
  }

  function stopBgmPersist() {
    if (bgmPersistTimer === null) return;
    window.clearInterval(bgmPersistTimer);
    bgmPersistTimer = null;
  }

  function tryStartBgm() {
    if (!enabled || !bgmAudio) return;
    if (!bgmAudio.paused && !bgmAudio.ended) return;
    applyPendingBgmSeek();
    bgmAudio.play()
      .then(() => {
        bgmStarted = true;
        startBgmPersist();
        saveBgmState();
        localStorage.setItem(BGM_UNLOCKED_KEY, "1");
      })
      .catch(() => {});
  }

  function getCtx() {
    if (!enabled || !AudioCtx) return null;
    if (!ctx) ctx = new AudioCtx();
    return ctx;
  }

  function unlock() {
    const c = getCtx();
    if (!c) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    tryStartBgm();
  }

  function playStatusOpen() {
    if (!enabled || !statusOpenAudio) return;
    const now = performance.now();
    if (now - lastStatusOpenAt < 220) return;
    lastStatusOpenAt = now;
    statusOpenAudio.currentTime = 0;
    statusOpenAudio.play().catch(() => {});
  }

  function playRankupSample() {
    if (!enabled || !rankupSampleAudio) return false;
    const now = performance.now();
    if (now - lastRankupAt < 320) return false;
    lastRankupAt = now;
    rankupSampleAudio.currentTime = 0;
    rankupSampleAudio.play().catch(() => {});
    return true;
  }

  function playPenaltySample() {
    if (!enabled || !penaltySampleAudio) return false;
    const now = performance.now();
    if (now - lastPenaltyAt < 200) return false;
    lastPenaltyAt = now;
    penaltySampleAudio.currentTime = 0;
    penaltySampleAudio.play().catch(() => {});
    return true;
  }

  function envGain(c, volume, duration) {
    const g = c.createGain();
    const now = c.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    g.connect(c.destination);
    return g;
  }

  function tone({
    freq = 440,
    toFreq = null,
    type = "sine",
    duration = 0.08,
    volume = 0.04,
    delay = 0
  }) {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const g = envGain(c, volume, duration + delay + 0.02);
    const t = c.currentTime + delay;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (toFreq) osc.frequency.exponentialRampToValueAtTime(toFreq, t + duration);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  function noise({ duration = 0.06, volume = 0.02, delay = 0 }) {
    const c = getCtx();
    if (!c) return;
    const buffer = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * duration)), c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;

    const source = c.createBufferSource();
    source.buffer = buffer;
    const g = envGain(c, volume, duration + delay + 0.02);
    const t = c.currentTime + delay;
    source.connect(g);
    source.start(t);
    source.stop(t + duration + 0.01);
  }

  const PRESETS = {
    cinematic: {
      click: { freq: 620, toFreq: 540, type: "triangle", duration: 0.045, volume: 0.03 },
      hover: { freq: 860, toFreq: 900, type: "sine", duration: 0.03, volume: 0.012 },
      menuA: { freq: 460, toFreq: 620, type: "triangle", duration: 0.05, volume: 0.03 },
      menuB: { freq: 620, toFreq: 700, type: "triangle", duration: 0.04, volume: 0.018, delay: 0.03 },
      successA: { freq: 520, toFreq: 620, type: "triangle", duration: 0.08, volume: 0.04 },
      successB: { freq: 660, toFreq: 800, type: "triangle", duration: 0.08, volume: 0.04, delay: 0.06 },
      error: { freq: 380, toFreq: 290, type: "sawtooth", duration: 0.12, volume: 0.03 },
      notifyA: { freq: 760, toFreq: 880, type: "sine", duration: 0.06, volume: 0.02 },
      notifyB: { freq: 880, toFreq: 930, type: "sine", duration: 0.05, volume: 0.016, delay: 0.05 },
      type: { min: 970, max: 1090, toMin: 840, toMax: 920, volume: 0.006 },
      rank: [
        { freq: 540, toFreq: 660, type: "triangle", duration: 0.12, volume: 0.05 },
        { freq: 660, toFreq: 840, type: "triangle", duration: 0.12, volume: 0.05, delay: 0.08 },
        { freq: 840, toFreq: 1120, type: "triangle", duration: 0.16, volume: 0.055, delay: 0.16 },
        { freq: 1120, toFreq: 1260, type: "sine", duration: 0.2, volume: 0.05, delay: 0.3 }
      ]
    },
    soft: {
      click: { freq: 540, toFreq: 500, type: "sine", duration: 0.04, volume: 0.018 },
      hover: { freq: 760, toFreq: 800, type: "sine", duration: 0.03, volume: 0.008 },
      menuA: { freq: 420, toFreq: 560, type: "sine", duration: 0.05, volume: 0.02 },
      menuB: { freq: 560, toFreq: 620, type: "sine", duration: 0.04, volume: 0.014, delay: 0.04 },
      successA: { freq: 500, toFreq: 560, type: "sine", duration: 0.07, volume: 0.02 },
      successB: { freq: 620, toFreq: 700, type: "sine", duration: 0.08, volume: 0.02, delay: 0.05 },
      error: { freq: 340, toFreq: 300, type: "triangle", duration: 0.1, volume: 0.02 },
      notifyA: { freq: 700, toFreq: 760, type: "sine", duration: 0.05, volume: 0.014 },
      notifyB: { freq: 760, toFreq: 820, type: "sine", duration: 0.05, volume: 0.012, delay: 0.04 },
      type: { min: 880, max: 970, toMin: 780, toMax: 860, volume: 0.0045 },
      rank: [
        { freq: 520, toFreq: 620, type: "sine", duration: 0.1, volume: 0.03 },
        { freq: 620, toFreq: 760, type: "sine", duration: 0.12, volume: 0.03, delay: 0.08 },
        { freq: 760, toFreq: 980, type: "sine", duration: 0.16, volume: 0.032, delay: 0.18 }
      ]
    },
    arcade: {
      click: { freq: 760, toFreq: 640, type: "square", duration: 0.035, volume: 0.03 },
      hover: { freq: 980, toFreq: 1030, type: "square", duration: 0.025, volume: 0.01 },
      menuA: { freq: 620, toFreq: 760, type: "square", duration: 0.04, volume: 0.025 },
      menuB: { freq: 760, toFreq: 920, type: "square", duration: 0.035, volume: 0.02, delay: 0.03 },
      successA: { freq: 660, toFreq: 900, type: "square", duration: 0.06, volume: 0.03 },
      successB: { freq: 900, toFreq: 1040, type: "square", duration: 0.06, volume: 0.03, delay: 0.05 },
      error: { freq: 420, toFreq: 260, type: "square", duration: 0.11, volume: 0.028 },
      notifyA: { freq: 900, toFreq: 980, type: "square", duration: 0.04, volume: 0.014 },
      notifyB: { freq: 980, toFreq: 1060, type: "square", duration: 0.04, volume: 0.012, delay: 0.03 },
      type: { min: 1080, max: 1220, toMin: 900, toMax: 1040, volume: 0.0065 },
      rank: [
        { freq: 680, toFreq: 820, type: "square", duration: 0.08, volume: 0.04 },
        { freq: 820, toFreq: 1020, type: "square", duration: 0.08, volume: 0.04, delay: 0.07 },
        { freq: 1020, toFreq: 1320, type: "square", duration: 0.12, volume: 0.04, delay: 0.14 },
        { freq: 1320, toFreq: 1520, type: "sine", duration: 0.12, volume: 0.03, delay: 0.27 }
      ]
    }
  };

  function currentPreset() {
    return PRESETS[currentPresetName] || PRESETS[DEFAULT_PRESET];
  }

  const api = {
    setPreset(name) {
      if (!PRESETS[name]) return false;
      currentPresetName = name;
      localStorage.setItem(PRESET_KEY, name);
      api.notify();
      return true;
    },
    getPreset() {
      return currentPresetName;
    },
    listPresets() {
      return Object.keys(PRESETS);
    },
    click() {
      tone(currentPreset().click);
    },
    hover() {
      const now = performance.now();
      if (now - lastHoverAt < 110) return;
      lastHoverAt = now;
      tone(currentPreset().hover);
    },
    menu() {
      const p = currentPreset();
      tone(p.menuA);
      tone(p.menuB);
    },
    success() {
      const p = currentPreset();
      tone(p.successA);
      tone(p.successB);
    },
    error() {
      tone(currentPreset().error);
      noise({ duration: 0.05, volume: 0.015, delay: 0.02 });
    },
    notify() {
      const p = currentPreset();
      tone(p.notifyA);
      tone(p.notifyB);
    },
    statusOpen() {
      playStatusOpen();
    },
    penalty() {
      if (postToTop("solo-penalty")) return;
      if (!playPenaltySample()) {
        tone(currentPreset().error);
      }
    },
    unlockAudio() {
      unlock();
    },
    type() {
      const now = performance.now();
      if (now - lastTypeAt < 45) return;
      lastTypeAt = now;
      const p = currentPreset().type;
      tone({
        freq: p.min + Math.random() * (p.max - p.min),
        toFreq: p.toMin + Math.random() * (p.toMax - p.toMin),
        type: "square",
        duration: 0.015,
        volume: p.volume
      });
    },
    rankup() {
      if (postToTop("solo-rankup")) return;
      if (!playRankupSample()) {
        currentPreset().rank.forEach((layer) => tone(layer));
        noise({ duration: 0.09, volume: 0.016, delay: 0.2 });
      }
    }
  };

  window.SFX = api;

  if (bgmAudio) {
    const saved = readBgmState();
    if (saved) {
      const elapsedSec = Math.max(0, (Date.now() - saved.ts) / 1000);
      pendingBgmSeek = saved.time + elapsedSec;
    }
    bgmAudio.addEventListener("loadedmetadata", applyPendingBgmSeek);
  }

  if (localStorage.getItem(BGM_UNLOCKED_KEY) === "1") {
    setTimeout(() => {
      tryStartBgm();
    }, 0);
  }

  document.addEventListener("pointerdown", unlock, { passive: true });
  document.addEventListener("keydown", unlock, { passive: true });
  window.addEventListener("pageshow", tryStartBgm);
  window.addEventListener("focus", tryStartBgm);
  window.addEventListener("pagehide", () => {
    saveBgmState();
    stopBgmPersist();
  });
  window.addEventListener("beforeunload", () => {
    saveBgmState();
    stopBgmPersist();
  });
  document.addEventListener("visibilitychange", () => {
    if (!bgmAudio) return;
    if (document.hidden) {
      saveBgmState();
      stopBgmPersist();
      bgmAudio.pause();
      return;
    }
    tryStartBgm();
  });

  document.addEventListener("pointerdown", (event) => {
    if (!canPlayBgm && window.top && window.top !== window.self) {
      try {
        window.top.postMessage({ type: "solo-unlock-bgm" }, window.location.origin);
      } catch {
        // Ignore cross-window messaging failures.
      }
    }
    const el = event.target instanceof Element ? event.target.closest("button,a,label,input,select,summary") : null;
    if (!el) return;
    api.click();
  });

  document.addEventListener("pointerenter", (event) => {
    const el = event.target instanceof Element ? event.target.closest("button,a,label,.stat-up,.q-check") : null;
    if (!el) return;
    api.hover();
  }, true);
})();
