import "./style.css";

const mobileMenu = document.getElementById("mobile-menu");
const burger = document.querySelector<HTMLButtonElement>(".burger");

const setMobileOpen = (open: boolean) => {
  if (!mobileMenu || !burger) return;
  burger.setAttribute("aria-expanded", open ? "true" : "false");
  mobileMenu.toggleAttribute("hidden", !open);
  document.documentElement.toggleAttribute("data-menu-open", open);
};

burger?.addEventListener("click", () => {
  const isOpen = burger.getAttribute("aria-expanded") === "true";
  setMobileOpen(!isOpen);
});

document.addEventListener("click", (e) => {
  if (!burger || !mobileMenu) return;
  const target = e.target as HTMLElement | null;
  if (!target) return;
  const withinMenu = target.closest("#mobile-menu");
  const withinBurger = target.closest(".burger");
  if (!withinMenu && !withinBurger) setMobileOpen(false);
});

mobileMenu?.addEventListener("click", (e) => {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  if (target.closest("a")) setMobileOpen(false);
});

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealEls = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));

if (prefersReduced) {
  revealEls.forEach((el) => el.classList.add("is-visible"));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add("is-visible");
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
  );

  revealEls.forEach((el, i) => {
    el.style.setProperty("--d", `${Math.min(180 + i * 45, 540)}ms`);
    io.observe(el);
  });
}

