"use strict";

const PROFILE_KEY = "soloLevelingProfile";
const QUEST_KEY = "soloLevelingDailyQuest";
const BOT_CONFIG_KEY = "soloLevelingBotConfig";

const formEl = document.getElementById("chatForm");
const inputEl = document.getElementById("chatInput");
const messagesEl = document.getElementById("chatMessages");
const quickEl = document.getElementById("chatQuick");

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

function getBotConfig() {
  const config = readJSON(BOT_CONFIG_KEY);
  if (config) return config;
  const initial = {
    coachMode: false,
    lastPlanAt: null,
    dailyPlan: []
  };
  writeJSON(BOT_CONFIG_KEY, initial);
  return initial;
}

function addMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `chat-msg ${role}`;
  bubble.textContent = text;
  messagesEl.appendChild(bubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  if (role === "bot" && window.SFX) window.SFX.notify();
}

function formatTime(ms) {
  if (!ms || ms <= 0) return "00:00:00";
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (v) => String(v).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function profileSummary(profile) {
  if (!profile) {
    return "Voce ainda nao criou um perfil. Va em Cadastro e defina nome, classe e status iniciais.";
  }

  return `Nome: ${profile.name || "-"} | Nivel: ${profile.level || 1} | Rank: ${profile.rank || "E"} | EXP: ${profile.exp || 0}/${profile.expToNext || 120} | Recompensas: ${profile.rewardPoints || 0}`;
}

function questSummary(quest) {
  if (!quest) {
    return "Ainda nao existe missao diaria gerada. Entre no Painel Principal para iniciar.";
  }

  const left = quest.resetAt - Date.now();
  const total = quest.tasks.length;
  const done = quest.tasks.filter((t) => t.completed).length;

  if (quest.rewardClaimed) {
    return `Missao diaria concluida (${done}/${total}). Proximo reset em ${formatTime(left)}.`;
  }

  return `Missao diaria em andamento (${done}/${total}). Reset em ${formatTime(left)}.`;
}

function progressAdvice(profile, quest) {
  if (!profile) return "Primeiro, crie seu perfil no Cadastro.";
  if (!quest) return "Entre no Painel Principal para gerar as missoes do dia.";

  const done = quest.tasks.filter((t) => t.completed).length;
  const total = quest.tasks.length;
  const left = quest.resetAt - Date.now();

  if (quest.rewardClaimed) {
    return "Voce fechou o ciclo de hoje. Foque em descanso ativo, hidratacao e sono.";
  }

  if (left < 2 * 60 * 60 * 1000) {
    return `Faltam ${total - done} tarefas e menos de 2 horas para reset. Priorize concluir agora.`;
  }

  return `Voce concluiu ${done}/${total} tarefas hoje. Mantenha consistencia e finalize o restante antes do reset.`;
}

function evolutionAdvice(profile) {
  if (!profile) return "Crie seu perfil primeiro para receber orientacoes personalizadas.";

  const stats = profile.stats || {};
  const weakest = Object.entries({
    forca: Number(stats.forca || 0),
    vitalidade: Number(stats.vitalidade || 0),
    agilidade: Number(stats.agilidade || 0),
    inteligencia: Number(stats.inteligencia || 0),
    persistencia: Number(stats.persistencia || 0)
  }).sort((a, b) => a[1] - b[1])[0];

  const map = {
    forca: "Forca: inclua exercicios de carga progressiva 3x por semana.",
    vitalidade: "Vitalidade: foque cardio leve + sono regular + hidratacao.",
    agilidade: "Agilidade: adicione mobilidade, coordenacao e deslocamentos curtos.",
    inteligencia: "Inteligencia: reserve 30-60 min diarios de estudo focado.",
    persistencia: "Persistencia: use rotina fixa e checklist diario sem excecao."
  };

  return `Seu ponto mais fraco agora e ${weakest[0]}. ${map[weakest[0]]}`;
}

function makeDailyPlan(profile, quest) {
  if (!profile || !quest) {
    return "Para gerar plano, voce precisa ter perfil e missao diaria ativos.";
  }

  const remaining = quest.tasks.filter((task) => !task.completed);
  if (!remaining.length) {
    return "Voce ja concluiu as missoes de hoje. Seu plano agora e recuperacao: hidratar, alongar e dormir bem.";
  }

  const plan = [];
  plan.push("1) Bloco fisico 1: conclua 2 exercicios em sequencia (20-30 min).");
  plan.push("2) Pausa curta: 5-10 min de respiracao/hidratacao.");
  plan.push("3) Bloco fisico 2: finalize os exercicios restantes.");
  plan.push("4) Fechamento: registre aprendizado do dia em 3 linhas.");

  const config = getBotConfig();
  config.lastPlanAt = new Date().toISOString();
  config.dailyPlan = plan;
  writeJSON(BOT_CONFIG_KEY, config);

  return `Plano de hoje gerado para ${profile.name || "jogador"}: ${plan.join(" ")}`;
}

function toggleCoach(enable) {
  const config = getBotConfig();
  config.coachMode = enable;
  writeJSON(BOT_CONFIG_KEY, config);
  return enable
    ? "Modo coach ativado. Vou priorizar orientacoes praticas e sequencia de acao."
    : "Modo coach desativado.";
}

function navigateTo(url) {
  setTimeout(() => {
    window.location.href = url;
  }, 500);
}

function resetQuestNow() {
  localStorage.removeItem(QUEST_KEY);
  return "Missao diaria resetada. Abra o Painel Principal para gerar nova missao.";
}

function showPlanSaved() {
  const config = getBotConfig();
  if (!config.dailyPlan || !config.dailyPlan.length) {
    return "Nao existe plano salvo ainda. Digite: gerar plano.";
  }
  return `Plano salvo: ${config.dailyPlan.join(" ")}`;
}

function botReply(rawText) {
  const text = rawText.toLowerCase().trim();
  const profile = readJSON(PROFILE_KEY);
  const quest = readJSON(QUEST_KEY);
  const config = getBotConfig();

  if (!text || text === "ajuda" || text === "help" || text === "comandos") {
    return "Comandos: status, missao, progresso, como evoluir, gerar plano, mostrar plano, ativar coach, desativar coach, ir painel, ir perfil, ir cadastro, reset missao, limpar.";
  }

  if (text.includes("status")) {
    return profileSummary(profile);
  }

  if (text.includes("missao") || text.includes("daily")) {
    return questSummary(quest);
  }

  if (text.includes("progresso")) {
    return progressAdvice(profile, quest);
  }

  if (text.includes("como evoluir") || text.includes("evoluir") || text.includes("melhorar")) {
    return evolutionAdvice(profile);
  }

  if (text.includes("gerar plano") || text.includes("planejar")) {
    return makeDailyPlan(profile, quest);
  }

  if (text.includes("mostrar plano") || text.includes("ver plano")) {
    return showPlanSaved();
  }

  if (text.includes("ativar coach")) {
    return toggleCoach(true);
  }

  if (text.includes("desativar coach")) {
    return toggleCoach(false);
  }

  if (text.includes("reset missao")) {
    return resetQuestNow();
  }

  if (text.includes("reset")) {
    if (!quest) return "Sem missao ativa no momento.";
    return `Tempo para reset: ${formatTime(quest.resetAt - Date.now())}.`;
  }

  if (text.includes("ir painel")) {
    navigateTo("next-step.html");
    return "Abrindo Painel Principal...";
  }

  if (text.includes("ir perfil")) {
    navigateTo("profile.html");
    return "Abrindo Perfil...";
  }

  if (text.includes("ir cadastro")) {
    navigateTo("class-select.html");
    return "Abrindo Cadastro...";
  }

  if (text.includes("limpar")) {
    messagesEl.innerHTML = "";
    return "Conversa limpa. Vamos continuar.";
  }

  if (text.includes("perfil")) {
    return "Use o menu lateral para abrir Perfil e revisar sua evolucao.";
  }

  if (config.coachMode) {
    return `Modo coach: ${progressAdvice(profile, quest)} ${evolutionAdvice(profile)}`;
  }

  return "Entendi. Se quiser, pergunte sobre status, missao, progresso, gerar plano ou como evoluir.";
}

function handleUserInput(text) {
  addMessage("user", text);
  addMessage("bot", botReply(text));
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  handleUserInput(text);
  inputEl.value = "";
  inputEl.focus();
});

quickEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const question = target.dataset.q || "";
  if (!question) return;
  handleUserInput(question);
});

addMessage("bot", "Chatbot online. Digite 'ajuda' para ver comandos e acoes.");
