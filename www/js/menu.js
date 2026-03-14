"use strict";

const body = document.body;
const slideNav = document.getElementById("slideNav");
const navTrigger = document.getElementById("navTrigger");

if (body) {
  body.classList.add("page-enter");
  requestAnimationFrame(() => {
    body.classList.add("page-enter-active");
  });
}

function navigateWithTransition(targetHref) {
  if (!targetHref) return;
  if (body) {
    body.classList.add("page-leave");
  }
  setTimeout(() => {
    window.location.href = targetHref;
  }, 220);
}

function setNavOpen(openState) {
  if (!slideNav) return;
  slideNav.classList.toggle("open", openState);
}

if (slideNav) {
  navTrigger?.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = !slideNav.classList.contains("open");
    setNavOpen(willOpen);
    if (window.SFX) window.SFX.menu();
  });

  slideNav.addEventListener("mouseenter", () => setNavOpen(true));
  slideNav.addEventListener("mouseleave", () => setNavOpen(false));
  slideNav.addEventListener("focusin", () => setNavOpen(true));
  slideNav.addEventListener("focusout", (event) => {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !slideNav.contains(nextTarget)) {
      setNavOpen(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node) || slideNav.contains(event.target)) return;
    setNavOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setNavOpen(false);
    }
  });

  const currentPage = window.location.pathname.split("/").pop() || "next-step.html";
  slideNav.querySelectorAll("a[href]").forEach((link) => {
    const targetHref = link.getAttribute("href") || "";
    if (targetHref === currentPage) {
      link.classList.add("active");
    }

    link.addEventListener("click", (event) => {
      event.preventDefault();
      setNavOpen(false);
      navigateWithTransition(targetHref);
    });
  });
}

document.addEventListener("click", (event) => {
  const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!anchor) return;
  if (slideNav && slideNav.contains(anchor)) return;

  const href = anchor.getAttribute("href");
  if (!href) return;
  if (href.startsWith("#") || href.startsWith("http://") || href.startsWith("https://")) return;

  event.preventDefault();
  navigateWithTransition(href);
});
