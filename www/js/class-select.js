"use strict";

const CLASSES = ["Guerreiro", "Mago", "Suporte", "Atirador", "Assasino"];
const PROFILE_KEY = "soloLevelingProfile";

const classListEl = document.getElementById("classList");
const formEl = document.getElementById("setupForm");
const errorEl = document.getElementById("errorMsg");
const nameEl = document.getElementById("playerName");
const birthDateEl = document.getElementById("playerBirthDate");
const sexEl = document.getElementById("playerSex");
const photoEl = document.getElementById("playerPhoto");
const photoPreviewEl = document.getElementById("photoPreview");

function getSavedProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
  } catch {
    return null;
  }
}

function renderClassOptions(lockedClass) {
  classListEl.innerHTML = "";

  CLASSES.forEach((className) => {
    const id = `class-${className.toLowerCase()}`;
    const disabled = Boolean(lockedClass && lockedClass !== className);
    const checked = lockedClass ? lockedClass === className : false;

    const wrapper = document.createElement("label");
    wrapper.className = `class-card${disabled ? " is-disabled" : ""}`;
    wrapper.htmlFor = id;
    wrapper.innerHTML = `
      <input
        id="${id}"
        type="radio"
        name="playerClass"
        value="${className}"
        ${checked ? "checked" : ""}
        ${disabled ? "disabled" : ""}
        required
      />
      <span class="class-label">${className}</span>
    `;
    classListEl.appendChild(wrapper);
  });

  bindClassSelection();
}

function bindClassSelection() {
  const inputs = classListEl.querySelectorAll("input[name='playerClass']");
  const sync = () => {
    classListEl.querySelectorAll(".class-card").forEach((card) => {
      const input = card.querySelector("input[name='playerClass']");
      card.classList.toggle("selected", Boolean(input && input.checked));
    });
  };

  inputs.forEach((input) => {
    input.addEventListener("change", sync);
    input.addEventListener("input", sync);
  });

  sync();
}

function randomDelta() {
  return Math.floor(Math.random() * 7) - 3;
}

function buildStats(playerClass) {
  const base = {
    Guerreiro: { forca: 18, vitalidade: 16, inteligencia: 9, agilidade: 11, persistencia: 15 },
    Mago: { forca: 8, vitalidade: 10, inteligencia: 20, agilidade: 12, persistencia: 13 },
    Suporte: { forca: 10, vitalidade: 12, inteligencia: 16, agilidade: 12, persistencia: 16 },
    Atirador: { forca: 12, vitalidade: 11, inteligencia: 13, agilidade: 17, persistencia: 13 },
    Assasino: { forca: 14, vitalidade: 9, inteligencia: 12, agilidade: 20, persistencia: 12 }
  };

  const src = base[playerClass] || base.Suporte;
  return {
    forca: Math.max(1, src.forca + randomDelta()),
    vitalidade: Math.max(1, src.vitalidade + randomDelta()),
    inteligencia: Math.max(1, src.inteligencia + randomDelta()),
    agilidade: Math.max(1, src.agilidade + randomDelta()),
    persistencia: Math.max(1, src.persistencia + randomDelta())
  };
}

async function fileToDataUrl(file) {
  if (!file) return "";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function selectedClass() {
  const checked = document.querySelector("input[name='playerClass']:checked");
  return checked ? checked.value : "";
}

function setError(msg) {
  errorEl.textContent = msg;
  if (msg && window.SFX) window.SFX.error();
}

function setPhotoPreview(dataUrl) {
  if (!photoPreviewEl) return;
  if (dataUrl) {
    photoPreviewEl.innerHTML = `<img src="${dataUrl}" alt="Preview da foto" class="preview-img" />`;
  } else {
    photoPreviewEl.innerHTML = `
      <span class="photo-icon">+</span>
      <span class="photo-tip">Toque para enviar foto</span>
    `;
  }
}

function prefillIfLocked(profile) {
  if (!profile || !profile.classLocked) {
    nameEl.readOnly = false;
    birthDateEl.disabled = false;
    sexEl.disabled = false;
    renderClassOptions("");
    setPhotoPreview("");
    return;
  }

  nameEl.value = profile.name || "";
  birthDateEl.value = profile.birthDate || "";
  sexEl.value = profile.sex || "";
  nameEl.readOnly = true;
  birthDateEl.disabled = true;
  sexEl.disabled = true;
  renderClassOptions(profile.playerClass);
  setPhotoPreview(profile.photoDataUrl || "");
  setError(`Classe bloqueada: ${profile.playerClass}. Edicao de nome apenas no Perfil.`);
}

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");

  const saved = getSavedProfile();
  const lockedClass = saved && saved.classLocked ? saved.playerClass : "";
  const chosenClass = selectedClass();
  const name = lockedClass ? (saved?.name || "").trim() : nameEl.value.trim();
  const birthDate = lockedClass ? (saved?.birthDate || "") : birthDateEl.value;
  const sex = lockedClass ? (saved?.sex || "") : sexEl.value;

  if (!name || !birthDate || !sex || !chosenClass) {
    setError("Preencha nome, data de nascimento, sexo e classe.");
    return;
  }

  if (lockedClass && chosenClass !== lockedClass) {
    setError("Nao e possivel mudar de classe apos a escolha inicial.");
    return;
  }

  const file = photoEl.files && photoEl.files[0] ? photoEl.files[0] : null;
  const photoDataUrl = file ? await fileToDataUrl(file) : (saved?.photoDataUrl || "");

  const profile = {
    name,
    birthDate,
    sex,
    playerClass: lockedClass || chosenClass,
    classLocked: true,
    photoDataUrl,
    stats: saved?.stats || buildStats(chosenClass),
    level: Number(saved?.level ?? 1),
    rank: saved?.rank || "E",
    exp: Number(saved?.exp ?? 0),
    expToNext: Number(saved?.expToNext ?? 120),
    rewardPoints: Number(saved?.rewardPoints ?? 0),
    abilityPoints: Number(saved?.abilityPoints ?? 0),
    fatigue: Number(saved?.fatigue ?? 0),
    penalties: Number(saved?.penalties ?? 0),
    createdAt: saved?.createdAt || new Date().toISOString()
  };

  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  if (window.SFX) window.SFX.success();
  document.body.classList.add("page-leave");
  setTimeout(() => {
    window.location.href = "next-step.html";
  }, 220);
});

photoEl.addEventListener("change", async () => {
  const file = photoEl.files && photoEl.files[0] ? photoEl.files[0] : null;
  if (!file) {
    setPhotoPreview("");
    return;
  }
  const dataUrl = await fileToDataUrl(file);
  setPhotoPreview(dataUrl);
  if (window.SFX) window.SFX.notify();
});

prefillIfLocked(getSavedProfile());
