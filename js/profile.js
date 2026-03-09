"use strict";

const PROFILE_KEY = "soloLevelingProfile";

function rankByLevel(level) {
  if (level >= 60) return "SS";
  if (level >= 45) return "S";
  if (level >= 33) return "A";
  if (level >= 23) return "B";
  if (level >= 14) return "C";
  if (level >= 7) return "D";
  return "E";
}

function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
  } catch {
    return null;
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value ?? "");
}

function calculateAge(birthDate) {
  if (!birthDate) return "-";
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return "-";
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const m = today.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) {
    age--;
  }
  return age >= 0 ? age : "-";
}

function renderPhoto(profile) {
  const wrap = document.getElementById("photoWrap");
  if (!wrap) return;

  if (profile.photoDataUrl) {
    const img = document.createElement("img");
    img.className = "photo";
    img.alt = "Foto do jogador";
    img.src = profile.photoDataUrl;
    wrap.appendChild(img);
    return;
  }

  const placeholder = document.createElement("div");
  placeholder.className = "photo placeholder";
  placeholder.textContent = (profile.name || "?").slice(0, 1).toUpperCase();
  wrap.appendChild(placeholder);
}

function fillProfile(profile) {
  const level = Number(profile.level ?? 1);
  const rank = profile.rank || rankByLevel(level);

  setText("pName", profile.name);
  const computedAge = calculateAge(profile.birthDate);
  setText("pAge", computedAge === "-" ? profile.age ?? "-" : computedAge);
  setText("pSex", profile.sex || "-");
  setText("pClass", profile.playerClass);
  setText("sForca", profile.stats?.forca ?? 0);
  setText("sVitalidade", profile.stats?.vitalidade ?? profile.stats?.vida ?? profile.stats?.resistencia ?? 0);
  setText("sInteligencia", profile.stats?.inteligencia ?? 0);
  setText("sAgilidade", profile.stats?.agilidade ?? profile.stats?.velocidade ?? 0);
  setText("sPersistencia", profile.stats?.persistencia ?? profile.stats?.resistencia ?? 0);
  setText("sRank", rank);
  setText("sExp", `${profile.exp || 0}/${profile.expToNext || 120}`);
  renderPhoto(profile);
}

function bindNameEditing(profile) {
  const editBtn = document.getElementById("editNameBtn");
  const editor = document.getElementById("nameEditor");
  const input = document.getElementById("nameInput");
  const saveBtn = document.getElementById("saveNameBtn");
  const cancelBtn = document.getElementById("cancelNameBtn");

  if (!editBtn || !editor || !input || !saveBtn || !cancelBtn) return;

  const openEditor = () => {
    input.value = profile.name || "";
    editor.classList.remove("hidden");
    input.focus();
    input.select();
  };

  const closeEditor = () => {
    editor.classList.add("hidden");
  };

  editBtn.addEventListener("click", openEditor);

  cancelBtn.addEventListener("click", closeEditor);

  saveBtn.addEventListener("click", () => {
    const nextName = input.value.trim();
    if (!nextName) return;
    profile.name = nextName;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setText("pName", profile.name);
    if (window.SFX) window.SFX.success();
    closeEditor();
  });
}

const profile = getProfile();

if (!profile) {
  window.location.href = "class-select.html";
} else {
  fillProfile(profile);
  bindNameEditing(profile);
}

document.getElementById("confirmBtn").addEventListener("click", () => {
  document.body.classList.add("page-leave");
  setTimeout(() => {
    window.location.href = "next-step.html";
  }, 220);
});
