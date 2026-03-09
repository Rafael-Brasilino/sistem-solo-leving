"use strict";

(function initAppShell() {
  const frame = document.getElementById("appFrame");
  if (!frame) return;

  const DEFAULT_ROUTE = "next-step.html";
  const ALLOWED_PAGES = new Set([
    "class-select.html",
    "next-step.html",
    "profile.html",
    "chatbot.html"
  ]);

  function normalizeRoute(input) {
    if (!input) return DEFAULT_ROUTE;
    let raw = input;
    try {
      raw = decodeURIComponent(raw);
    } catch {
      // Keep original route if decode fails.
    }
    raw = raw.trim();
    const [pathPart, queryPart = ""] = raw.split("?");
    const page = pathPart.split("/").pop() || "";
    if (!ALLOWED_PAGES.has(page)) return DEFAULT_ROUTE;
    return queryPart ? `${page}?${queryPart}` : page;
  }

  function routeFromHash() {
    return normalizeRoute(window.location.hash.slice(1));
  }

  function applyHash(route) {
    const encoded = `#${encodeURIComponent(route)}`;
    if (window.location.hash === encoded) return;
    history.replaceState(null, "", encoded);
  }

  function navigateFrame(route) {
    const next = normalizeRoute(route);
    if (frame.dataset.route === next) return;
    frame.dataset.route = next;
    frame.src = next;
    applyHash(next);
  }

  window.__soloNavigate = (route) => {
    navigateFrame(route);
  };

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    const type = event.data && event.data.type ? event.data.type : "";
    if (!type) return;

    if (type === "solo-unlock-bgm") {
      if (window.SFX && typeof window.SFX.unlockAudio === "function") {
        window.SFX.unlockAudio();
      }
      return;
    }

    if (type === "solo-status-open") {
      if (window.SFX && typeof window.SFX.statusOpen === "function") {
        window.SFX.statusOpen();
      }
      return;
    }

    if (type === "solo-rankup") {
      if (window.SFX && typeof window.SFX.rankup === "function") {
        window.SFX.rankup();
      }
      return;
    }

    if (type === "solo-penalty") {
      if (window.SFX && typeof window.SFX.penalty === "function") {
        window.SFX.penalty();
      }
    }
  });

  window.addEventListener("hashchange", () => {
    navigateFrame(routeFromHash());
  });

  frame.addEventListener("load", () => {
    let current = frame.dataset.route || DEFAULT_ROUTE;
    try {
      const { pathname, search } = frame.contentWindow.location;
      const page = pathname.split("/").pop() || DEFAULT_ROUTE;
      current = normalizeRoute(page + (search || ""));
      frame.dataset.route = current;
    } catch {
      // Ignore access errors, keep last known route.
    }
    applyHash(current);
  });

  navigateFrame(routeFromHash());
})();
