const textEl = document.getElementById("systemText");
const boxEl = document.querySelector(".systemBox");
const statusEl = document.getElementById("choiceStatus");
const titleEl = document.querySelector(".systemTitle");
const iconEl = document.querySelector(".alertIcon");
const actionsEl = document.getElementById("actions");
const acceptBtn = document.getElementById("acceptBtn");
const rejectBtn = document.getElementById("rejectBtn");

const typingDelay = 34;
const ONBOARDING_KEY = "soloLevelingFirstEntryDone";
const PROFILE_KEY = "soloLevelingProfile";

function appRoute(page) {
  return `app-shell.html#${encodeURIComponent(page)}`;
}

function readProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
  } catch {
    return null;
  }
}

function nextRouteForReturningUser() {
  const profile = readProfile();
  if (profile && profile.classLocked) return appRoute("next-step.html");
  return appRoute("class-select.html");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setHeader(title, icon) {
  titleEl.textContent = title;
  iconEl.textContent = icon;
  if (window.SFX) window.SFX.notify();
}

function setActionsVisible(visible) {
  actionsEl.classList.toggle("hidden", !visible);
}

async function typeWriter(segments, delay = typingDelay) {
  textEl.innerHTML = "";

  const cursor = document.createElement("span");
  cursor.className = "typing-cursor";
  cursor.textContent = "|";
  textEl.appendChild(cursor);

  for (const segment of segments) {
    let target = textEl;

    if (segment.className) {
      const span = document.createElement("span");
      span.className = segment.className;
      textEl.insertBefore(span, cursor);
      target = span;
    }

    for (const char of segment.text) {
      if (segment.className) {
        target.textContent += char;
      } else {
        textEl.insertBefore(document.createTextNode(char), cursor);
      }
      if (window.SFX) window.SFX.type();
      await wait(delay);
    }
  }

  cursor.remove();
}

async function runSystemSequence() {
  setActionsVisible(false);
  statusEl.textContent = "";

  setHeader("LOADING", "*");
  textEl.innerHTML =
    '<div class="loadingLine">Carregando sistema<span class="loadingDots"></span></div><div class="loadingBar"><span></span></div>';
  await wait(2800);

  setHeader("NOTIFICACAO", "!");
  await typeWriter([
    { text: 'Quest secreta concluida:\n', className: "" },
    { text: '"A Coragem dos Fracos."', className: "accent" }
  ]);

  await wait(1400);
  textEl.classList.add("fade-out");
  await wait(500);
  textEl.classList.remove("fade-out");
  await typeWriter([
    { text: "Voce tem requisicoes qualificadas para ser um ", className: "" },
    { text: "JOGADOR", className: "accent" },
    { text: ".\nVoce aceita?", className: "" }
  ]);

  setActionsVisible(true);
}

function handleChoice(accepted) {
  boxEl.classList.remove("accepted", "rejected");

  if (accepted) {
    localStorage.setItem(ONBOARDING_KEY, "1");
    boxEl.classList.add("accepted");
    statusEl.textContent = "REQUISICAO ACEITA";
    statusEl.style.color = "#8fffd6";
    if (window.SFX) window.SFX.success();
    setTimeout(() => {
      window.location.href = appRoute("class-select.html");
    }, 900);
  } else {
    boxEl.classList.add("rejected");
    statusEl.textContent = "REQUISICAO NEGADA";
    statusEl.style.color = "#ff7aa5";
    if (window.SFX && typeof window.SFX.penalty === "function") {
      window.SFX.penalty();
    } else if (window.SFX) {
      window.SFX.error();
    }
  }
}

acceptBtn.addEventListener("click", () => handleChoice(true));
rejectBtn.addEventListener("click", () => handleChoice(false));

window.addEventListener("load", () => {
  const alreadyEntered = localStorage.getItem(ONBOARDING_KEY) === "1";
  if (alreadyEntered) {
    window.location.replace(nextRouteForReturningUser());
    return;
  }
  runSystemSequence();
});
