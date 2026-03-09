"use strict";

const initPageSwitch = () => {
  const buttons = Array.from(document.querySelectorAll(".page-arrow"));
  if (!buttons.length) return;

  const panelTargets = Array.from(document.querySelectorAll(".hud-card, .profile-card"));

  const playStatusOpen = () => {
    if (window.top && window.top !== window.self) {
      try {
        window.top.postMessage({ type: "solo-status-open" }, window.location.origin);
      } catch {
        // Ignore cross-window messaging failures.
      }
      return;
    }
    if (window.SFX && typeof window.SFX.statusOpen === "function") {
      window.SFX.statusOpen();
    }
  };

  const animatePanels = (state) => {
    panelTargets.forEach((panel) => {
      panel.classList.toggle("panel-open", state);
    });
  };

  const replayOpenPanels = () => {
    playStatusOpen();
    panelTargets.forEach((panel) => {
      panel.classList.remove("panel-open");
      // Force reflow to restart animation when hovering arrows.
      void panel.offsetWidth;
      panel.classList.add("panel-open");
    });
  };

  const goTo = (target, direction) => {
    if (!target) return;
    document.body.classList.add(direction === "left" ? "slide-out-left" : "slide-out-right");
    animatePanels(false);
    if (window.SFX) window.SFX.menu();
    setTimeout(() => {
      window.location.href = target;
    }, 260);
  };

  buttons.forEach((button) => {
    const { target, direction } = button.dataset;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      goTo(target, direction);
    });

    button.addEventListener("mouseenter", () => replayOpenPanels());
    button.addEventListener("mouseleave", () => animatePanels(false));
  });

  requestAnimationFrame(() => {
    replayOpenPanels();
    setTimeout(() => animatePanels(false), 460);
  });
};

initPageSwitch();
