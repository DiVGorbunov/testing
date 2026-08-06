/* ============================================================
   SLOTKINGS — interactions & animations
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Sticky header ---------- */
  const header = document.querySelector(".site-header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 24);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Burger / mobile nav ---------- */
  const burger = document.getElementById("burger");
  const nav = document.getElementById("mainNav");
  if (burger && nav) {
    const closeNav = () => {
      burger.classList.remove("open");
      nav.classList.remove("open");
      document.body.classList.remove("nav-locked");
      burger.setAttribute("aria-expanded", "false");
    };
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      burger.classList.toggle("open", open);
      document.body.classList.toggle("nav-locked", open);
      burger.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeNav));
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeNav(); });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  /* ---------- Animated counters ---------- */
  const counters = document.querySelectorAll(".counter");
  if (counters.length && "IntersectionObserver" in window) {
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          cio.unobserve(el);
          const target = parseInt(el.dataset.target, 10) || 0;
          const dur = 1600;
          const t0 = performance.now();
          const ease = (t) => 1 - Math.pow(1 - t, 3);
          const tick = (now) => {
            const p = Math.min((now - t0) / dur, 1);
            el.textContent = Math.round(target * ease(p)).toString();
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => cio.observe(el));
  } else {
    counters.forEach((el) => (el.textContent = el.dataset.target));
  }

  /* ---------- Hero particles ---------- */
  const particlesBox = document.getElementById("particles");
  if (particlesBox && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const COUNT = window.innerWidth < 768 ? 14 : 26;
    for (let i = 0; i < COUNT; i++) {
      const p = document.createElement("span");
      p.className = "particle" + (Math.random() > 0.55 ? " p-purple" : "");
      const size = 2 + Math.random() * 3.5;
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.left = Math.random() * 100 + "%";
      p.style.setProperty("--drift", (Math.random() * 120 - 60).toFixed(0) + "px");
      p.style.animationDuration = (7 + Math.random() * 9).toFixed(1) + "s";
      p.style.animationDelay = (-Math.random() * 16).toFixed(1) + "s";
      particlesBox.appendChild(p);
    }
  }

  /* ---------- News marquee: duplicate track for seamless loop ---------- */
  const track = document.getElementById("newsTrack");
  if (track) {
    track.innerHTML += track.innerHTML;
  }

  /* ---------- Toast helper ---------- */
  const toast = document.getElementById("toast");
  let toastTimer = null;
  window.skToast = function (msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  };

  /* ---------- "Coming soon" stubs ---------- */
  document.addEventListener("click", (e) => {
    const stub = e.target.closest("[data-coming-soon]");
    if (stub) {
      e.preventDefault();
      window.skToast("👑 " + (stub.dataset.comingSoon || "Coming soon"));
    }
  });

  /* ---------- Roadmap button (stub) ---------- */
  const roadmapBtn = document.getElementById("roadmapBtn");
  if (roadmapBtn) {
    roadmapBtn.addEventListener("click", () => window.skToast("👑 Roadmap PDF — Coming soon"));
  }

  /* ---------- Contact form (stub) ---------- */
  const form = document.getElementById("contactForm");
  if (form) {
    /* category pills */
    form.querySelectorAll(".pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        form.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
      });
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const success = document.getElementById("formSuccess");
      if (success) success.hidden = false;
      form.querySelector('button[type="submit"]').disabled = true;
      window.skToast("👑 Request sent — we'll reply within 24 hours");
    });
  }
})();
