"use strict";

const initPageSwitch = () => {
  const navPrev = document.body.dataset.navPrev;
  const navNext = document.body.dataset.navNext;
  if (!navPrev && !navNext) return;

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
      // Force reflow to restart animation.
      void panel.offsetWidth;
      panel.classList.add("panel-open");
    });
  };

  const goTo = (direction) => {
    const target = direction === "left" ? navNext : navPrev;
    if (!target) return;
    document.body.classList.add(direction === "left" ? "slide-out-left" : "slide-out-right");
    animatePanels(false);
    if (window.SFX) window.SFX.menu();
    setTimeout(() => {
      window.location.href = target;
    }, 260);
  };

  let startX = null;
  let startY = null;
  let pointerActive = false;

  const resetPointer = () => {
    startX = null;
    startY = null;
    pointerActive = false;
  };

  const onPointerDown = (event) => {
    if (event.isPrimary === false) return;
    pointerActive = true;
    startX = event.clientX;
    startY = event.clientY;
  };

  const onPointerUp = (event) => {
    if (!pointerActive || startX === null || startY === null) return resetPointer();
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    resetPointer();
    // Require horizontal intent and a minimal drag distance.
    if (absX < 60 || absX < absY) return;
    goTo(dx < 0 ? "left" : "right");
  };

  const onTouchStart = (event) => {
    if (!event.touches || event.touches.length !== 1) return;
    const touch = event.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    pointerActive = true;
  };

  const onTouchEnd = (event) => {
    if (!pointerActive || startX === null || startY === null) return resetPointer();
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return resetPointer();
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    resetPointer();
    if (absX < 60 || absX < absY) return;
    goTo(dx < 0 ? "left" : "right");
  };

  document.addEventListener("pointerdown", onPointerDown, { passive: true });
  document.addEventListener("pointerup", onPointerUp, { passive: true });
  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("touchend", onTouchEnd, { passive: true });

  requestAnimationFrame(() => {
    replayOpenPanels();
    setTimeout(() => animatePanels(false), 460);
  });
};

initPageSwitch();
