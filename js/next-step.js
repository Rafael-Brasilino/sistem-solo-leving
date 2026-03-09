"use strict";

const PROFILE_KEY = "soloLevelingProfile";
const QUEST_KEY = "soloLevelingDailyQuest";
const DAY_MS = 23 * 60 * 60 * 1000;

const questListEl = document.getElementById("questList");
const questMsgEl = document.getElementById("questMsg");
const questNoticeEl = document.getElementById("questNotice");
const resetTimerEl = document.getElementById("resetTimer");
const statsGridEl = document.querySelector(".stats-grid");
const rankUpOverlayEl = document.getElementById("rankUpOverlay");
const rankFromEl = document.getElementById("rankFrom");
const rankToEl = document.getElementById("rankTo");
const rankupRewardTextEl = document.getElementById("rankupRewardText");

const RANK_ORDER = ["E", "D", "C", "B", "A", "S", "SS"];
const RANK_BONUS = {
  D: { rewardPoints: 10, abilityPoints: 1 },
  C: { rewardPoints: 18, abilityPoints: 1 },
  B: { rewardPoints: 28, abilityPoints: 2 },
  A: { rewardPoints: 40, abilityPoints: 2 },
  S: { rewardPoints: 60, abilityPoints: 3 },
  SS: { rewardPoints: 90, abilityPoints: 4 }
};

let rankupQueue = [];
let rankupRunning = false;

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rankByLevel(level) {
  if (level >= 60) return "SS";
  if (level >= 50) return "S";
  if (level >= 40) return "A";
  if (level >= 30) return "B";
  if (level >= 20) return "C";
  if (level >= 10) return "D";
  return "E";
}

function rankIndex(rank) {
  return Math.max(0, RANK_ORDER.indexOf(rank));
}

function applyRankBonus(profile, fromRank, toRank) {
  const from = rankIndex(fromRank);
  const to = rankIndex(toRank);

  let rewardPoints = 0;
  let abilityPoints = 0;

  for (let i = from + 1; i <= to; i++) {
    const rank = RANK_ORDER[i];
    const bonus = RANK_BONUS[rank] || { rewardPoints: 0, abilityPoints: 0 };
    rewardPoints += bonus.rewardPoints;
    abilityPoints += bonus.abilityPoints;
  }

  profile.rewardPoints += rewardPoints;
  profile.abilityPoints += abilityPoints;

  return { rewardPoints, abilityPoints };
}

function levelToRepTarget(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  return Math.min(100, 10 + (safeLevel - 1) * 3);
}

function levelToWalkTarget() {
  return 1;
}

function normalizeStats(stats) {
  if (!stats) {
    return {
      forca: 10,
      vitalidade: 10,
      agilidade: 10,
      inteligencia: 10,
      persistencia: 10
    };
  }

  return {
    forca: Number(stats.forca || 10),
    vitalidade: Number(stats.vitalidade || stats.vida || stats.resistencia || 10),
    agilidade: Number(stats.agilidade || stats.velocidade || 10),
    inteligencia: Number(stats.inteligencia || 10),
    persistencia: Number(stats.persistencia || stats.resistencia || 10)
  };
}

function ensureProfile(rawProfile) {
  if (!rawProfile) {
    window.location.href = "class-select.html";
    return null;
  }

  const stats = normalizeStats(rawProfile.stats);
  const level = Number(rawProfile.level ?? 1);

  const profile = {
    ...rawProfile,
    stats,
    level,
    rank: rawProfile.rank || rankByLevel(level),
    fatigue: Number(rawProfile.fatigue ?? 0),
    penalties: Number(rawProfile.penalties ?? 0),
    exp: Number(rawProfile.exp ?? 0),
    expToNext: Number(rawProfile.expToNext ?? 120),
    rewardPoints: Number(rawProfile.rewardPoints ?? 0),
    abilityPoints: Number(rawProfile.abilityPoints ?? 0)
  };

  writeJSON(PROFILE_KEY, profile);
  return profile;
}

function statusNumbers(profile) {
  const hpMax = profile.stats.vitalidade * 12 + profile.level * 12;
  const mpMax = profile.stats.inteligencia * 9 + profile.level * 6;
  const fatigue = clamp(profile.fatigue, 0, 100);
  const hp = clamp(Math.round(hpMax - fatigue * 1.6), 1, hpMax);
  const mp = clamp(Math.round(mpMax - fatigue * 0.75), 1, mpMax);
  return { hp, hpMax, mp, mpMax, fatigue };
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function setBar(lineId, textId, value, max) {
  const line = document.getElementById(lineId);
  const text = document.getElementById(textId);
  const ratio = clamp(max > 0 ? value / max : 0, 0, 1);
  if (line) line.style.width = `${Math.round(ratio * 100)}%`;
  if (text) text.textContent = `${value}/${max}`;
}

function renderStatus(profile) {
  const numbers = statusNumbers(profile);

  setText("playerName", profile.name || "-");
  setText("playerClass", profile.playerClass || "-");
  setText("playerLevel", profile.level);
  setText("playerRank", profile.rank);
  setText("playerExp", profile.exp);
  setText("playerExpNext", profile.expToNext);
  setText("rewardPoints", profile.rewardPoints);

  setText("stForca", profile.stats.forca);
  setText("stVitalidade", profile.stats.vitalidade);
  setText("stAgilidade", profile.stats.agilidade);
  setText("stInteligencia", profile.stats.inteligencia);
  setText("stPersistencia", profile.stats.persistencia);
  setText("abilityPoints", profile.abilityPoints);

  setBar("hpLine", "hpText", numbers.hp, numbers.hpMax);
  setBar("mpLine", "mpText", numbers.mp, numbers.mpMax);
  setBar("fatigueLine", "fatigueText", numbers.fatigue, 100);

  setText("punishCount", profile.penalties);

  document.querySelectorAll(".stat-up").forEach((btn) => {
    btn.disabled = profile.abilityPoints <= 0;
  });
}

function createQuest(level) {
  const reps = levelToRepTarget(level);
  const walkKm = levelToWalkTarget();

  const tasks = [
    { id: "pushups", name: "Flexões", target: reps, unit: "rep", progress: 0, completed: false },
    { id: "situps", name: "Abdominais", target: reps, unit: "rep", progress: 0, completed: false },
    { id: "squats", name: "Agachamento", target: reps, unit: "rep", progress: 0, completed: false },
    { id: "walking", name: "Caminhada", target: walkKm, unit: "km", progress: 0, completed: false }
  ];

  return {
    levelBase: level,
    createdAt: Date.now(),
    resetAt: Date.now() + DAY_MS,
    rewardClaimed: false,
    completedAt: null,
    rewardSummary: null,
    tasks
  };
}

function allTasksDone(quest) {
  return quest.tasks.every((task) => task.completed);
}

function applyPunishment(profile) {
  profile.penalties += 1;
  profile.fatigue = clamp(profile.fatigue + 15, 0, 100);
  profile.exp = Math.max(0, profile.exp - 20);
  profile.stats.vitalidade = Math.max(1, profile.stats.vitalidade - 1);
  profile.stats.persistencia = Math.max(1, profile.stats.persistencia - 1);
  if (window.SFX && typeof window.SFX.penalty === "function") {
    window.SFX.penalty();
  } else if (window.SFX) {
    window.SFX.error();
  }
  writeJSON(PROFILE_KEY, profile);
}

function ensureQuest(profile) {
  let quest = readJSON(QUEST_KEY);
  const now = Date.now();

  if (!quest) {
    quest = createQuest(profile.level);
    writeJSON(QUEST_KEY, quest);
    return quest;
  }

  // Normalize old quests created before the 12h reset rule.
  const createdAt = Number(quest.createdAt || now);
  const maxResetAt = createdAt + DAY_MS;
  if (!Number.isFinite(quest.resetAt) || quest.resetAt > maxResetAt) {
    quest.resetAt = maxResetAt;
    writeJSON(QUEST_KEY, quest);
  }

  if (now >= quest.resetAt) {
    if (!quest.rewardClaimed) {
      applyPunishment(profile);
      questMsgEl.textContent = "Tempo esgotado. Punicao aplicada por falta de conclusao.";
    }
    quest = createQuest(profile.level);
    writeJSON(QUEST_KEY, quest);
  }

  return quest;
}

function valueLabel(value, unit) {
  if (unit === "km") return `${Number(value).toFixed(1)}km`;
  return `${Math.round(value)}`;
}

function addExp(profile, amount) {
  const startRank = profile.rank || rankByLevel(profile.level);
  let levelUps = 0;

  profile.exp += amount;

  while (profile.exp >= profile.expToNext) {
    profile.exp -= profile.expToNext;
    profile.level += 1;
    levelUps += 1;
    profile.rank = rankByLevel(profile.level);
    profile.expToNext = Math.round(profile.expToNext * 1.15);
    profile.abilityPoints += 2;
    profile.rewardPoints += 3;
  }

  profile.rank = profile.rank || rankByLevel(profile.level);
  const endRank = profile.rank;
  const rankUp = startRank !== endRank;
  const rankBonus = rankUp ? applyRankBonus(profile, startRank, endRank) : { rewardPoints: 0, abilityPoints: 0 };

  return {
    rankUp,
    levelUps,
    fromRank: startRank,
    toRank: endRank,
    rankBonus
  };
}

function runRankupAnimation(item) {
  if (!rankUpOverlayEl || !rankFromEl || !rankToEl || !rankupRewardTextEl) return;

  rankFromEl.textContent = item.fromRank;
  rankToEl.textContent = item.toRank;
  rankupRewardTextEl.textContent = `+${item.rankBonus.rewardPoints} Reward Points | +${item.rankBonus.abilityPoints} Ability Points`;

  rankUpOverlayEl.classList.remove("hidden");
  rankUpOverlayEl.classList.add("show");
  if (window.SFX) window.SFX.rankup();

  setTimeout(() => {
    rankUpOverlayEl.classList.remove("show");
    setTimeout(() => {
      rankUpOverlayEl.classList.add("hidden");
      rankupRunning = false;
      processRankupQueue();
    }, 260);
  }, 2100);
}

function processRankupQueue() {
  if (rankupRunning || !rankupQueue.length) return;
  rankupRunning = true;
  runRankupAnimation(rankupQueue.shift());
}

function enqueueRankup(summary) {
  if (!summary || !summary.rankUp) return;
  rankupQueue.push(summary);
  processRankupQueue();
}

function showQuestNotice(summary) {
  if (!summary) {
    questNoticeEl.classList.add("hidden");
    questNoticeEl.innerHTML = "";
    return;
  }

  questNoticeEl.classList.remove("hidden");
  questNoticeEl.innerHTML = `
    <strong>Missão Comprida!!</strong>
    <div>Recompensas: +${summary.exp} EXP, +${summary.rewardPoints} pontos de recompensa, +${summary.abilityPoints} ability points.</div>
  `;
}

function claimAutomaticReward(profile, quest) {
  if (!allTasksDone(quest) || quest.rewardClaimed) return;

  const reps = levelToRepTarget(profile.level);
  const km = levelToWalkTarget();

  const reward = {
    exp: Math.round(reps * 2 + km * 12),
    rewardPoints: Math.round(reps / 5) + km * 2,
    abilityPoints: 1
  };

  const expSummary = addExp(profile, reward.exp);
  profile.rewardPoints += reward.rewardPoints;
  profile.abilityPoints += reward.abilityPoints;
  profile.fatigue = clamp(profile.fatigue - 12, 0, 100);
  profile.stats.persistencia += 1;
  profile.stats.vitalidade += 1;

  quest.rewardClaimed = true;
  quest.completedAt = Date.now();
  quest.rewardSummary = reward;

  writeJSON(PROFILE_KEY, profile);
  writeJSON(QUEST_KEY, quest);
  showQuestNotice(reward);
  if (window.SFX) window.SFX.success();
  enqueueRankup(expSummary);
}

function renderQuest(profile, quest) {
  questListEl.innerHTML = "";

  quest.tasks.forEach((task) => {
    const row = document.createElement("div");
    row.className = "quest-item";
    row.innerHTML = `
      <div class="q-name">${task.name}</div>
      <div class="q-progress">[${valueLabel(task.progress, task.unit)}/${valueLabel(task.target, task.unit)}]</div>
      <input class="q-check" type="checkbox" data-task-id="${task.id}" ${task.completed ? "checked" : ""} ${quest.rewardClaimed ? "disabled" : ""} />
      <div class="q-mark ${task.completed ? "check" : "pending"}">${task.completed ? "OK" : "-"}</div>
    `;
    questListEl.appendChild(row);
  });

  if (!quest.rewardClaimed) {
    questMsgEl.textContent = "Marque os exercicios conforme concluir na vida real.";
    showQuestNotice(null);
  } else {
    questMsgEl.textContent = "Missao concluida e bloqueada ate o proximo reset.";
    showQuestNotice(quest.rewardSummary);
  }

  setText("punishCount", profile.penalties);
}

function markTaskComplete(profile, quest, taskId) {
  if (quest.rewardClaimed) return;

  const task = quest.tasks.find((item) => item.id === taskId);
  if (!task || task.completed) return;

  task.completed = true;
  task.progress = task.target;

  const expSummary = addExp(profile, task.unit === "km" ? 8 : 3);
  profile.rewardPoints += task.unit === "km" ? 2 : 1;

  writeJSON(PROFILE_KEY, profile);
  writeJSON(QUEST_KEY, quest);
  if (window.SFX) window.SFX.notify();
  enqueueRankup(expSummary);

  if (allTasksDone(quest)) {
    claimAutomaticReward(profile, quest);
  }
}

function formatTimer(ms) {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function bindStatusUpgrade(profile) {
  statsGridEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    if (!target.classList.contains("stat-up")) return;
    if (profile.abilityPoints <= 0) return;

    const stat = target.dataset.stat || "";
    if (!Object.prototype.hasOwnProperty.call(profile.stats, stat)) return;

    profile.stats[stat] += 1;
    profile.abilityPoints -= 1;
    writeJSON(PROFILE_KEY, profile);
    if (window.SFX) window.SFX.success();
    renderStatus(profile);
  });
}

function init() {
  const profile = ensureProfile(readJSON(PROFILE_KEY));
  if (!profile) return;

  let quest = ensureQuest(profile);
  renderStatus(profile);
  renderQuest(profile, quest);
  resetTimerEl.textContent = formatTimer(quest.resetAt - Date.now());

  bindStatusUpgrade(profile);

  questListEl.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.classList.contains("q-check")) return;

    if (!target.checked) {
      target.checked = true;
      return;
    }

    const taskId = target.dataset.taskId || "";
    markTaskComplete(profile, quest, taskId);
    renderStatus(profile);
    renderQuest(profile, quest);
  });

  setInterval(() => {
    const latestQuest = readJSON(QUEST_KEY);
    if (!latestQuest) return;

    const remaining = latestQuest.resetAt - Date.now();
    resetTimerEl.textContent = formatTimer(remaining);

    if (remaining <= 0) {
      location.reload();
    }
  }, 1000);
}

init();
