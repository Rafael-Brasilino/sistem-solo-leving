"use strict";

(function shellGuard() {
  if (window.self !== window.top) {
    document.documentElement.classList.add("in-shell");
    window.addEventListener("DOMContentLoaded", () => {
      if (document.body) document.body.classList.add("in-shell");
    });
    return;
  }

  const ALLOWED_PAGES = new Set([
    "class-select.html",
    "next-step.html",
    "profile.html",
    "chatbot.html"
  ]);

  const page = window.location.pathname.split("/").pop() || "";
  if (!ALLOWED_PAGES.has(page)) return;

  const route = `${page}${window.location.search || ""}`;
  const target = `app-shell.html#${encodeURIComponent(route)}`;
  window.location.replace(target);
})();
