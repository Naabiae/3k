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
const revealObserver =
  prefersReduced
    ? null
    : new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).classList.add("is-visible");
              revealObserver?.unobserve(entry.target);
            }
          }
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
      );

const observeReveals = (root: ParentNode) => {
  const els = Array.from(root.querySelectorAll<HTMLElement>(".reveal"));
  if (prefersReduced) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  els.forEach((el, i) => {
    if (el.classList.contains("is-visible")) return;
    el.style.setProperty("--d", `${Math.min(120 + i * 42, 520)}ms`);
    revealObserver?.observe(el);
  });
};

type Route =
  | { name: "home"; section?: string }
  | { name: "onboarding" }
  | { name: "dashboard" };

const parseRoute = (): Route => {
  const raw = window.location.hash || "#/";
  if (!raw.startsWith("#/")) return { name: "home" };
  const path = raw.slice(2);
  const parts = path.split("/").filter(Boolean);
  const head = parts[0] ?? "";

  if (head === "onboarding") return { name: "onboarding" };
  if (head === "dashboard") return { name: "dashboard" };
  if (head === "home") return { name: "home", section: parts[1] };
  return { name: "home" };
};

const views = Array.from(document.querySelectorAll<HTMLElement>(".view[data-view]"));
const setView = (name: string) => {
  views.forEach((v) => {
    const active = v.dataset.view === name;
    v.classList.toggle("is-active", active);
    v.setAttribute("aria-hidden", active ? "false" : "true");
  });
  const activeView = views.find((v) => v.dataset.view === name);
  if (activeView) observeReveals(activeView);
};

const scrollToSection = (id?: string) => {
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
  });
};

const toast = (() => {
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  document.body.appendChild(el);
  let t: number | undefined;
  return (msg: string) => {
    el.textContent = msg;
    el.classList.add("toast--on");
    window.clearTimeout(t);
    t = window.setTimeout(() => el.classList.remove("toast--on"), 2600);
  };
})();

const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const apiFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    const msg = typeof json?.error === "string" ? json.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return json as T;
};

type Profile = {
  email: string;
  walletAddress: string;
  routerAddress: string;
};

const storage = {
  getWallet: () => localStorage.getItem("qie_wallet") || "",
  setWallet: (v: string) => localStorage.setItem("qie_wallet", v),
  clearWallet: () => localStorage.removeItem("qie_wallet"),
  getRequestId: () => localStorage.getItem("qie_kyc_requestId") || "",
  setRequestId: (v: string) => localStorage.setItem("qie_kyc_requestId", v),
  clearRequestId: () => localStorage.removeItem("qie_kyc_requestId"),
  getProfile: (): Profile | null => {
    const raw = localStorage.getItem("qie_profile");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Profile;
    } catch {
      return null;
    }
  },
  setProfile: (p: Profile) => localStorage.setItem("qie_profile", JSON.stringify(p)),
  clearProfile: () => localStorage.removeItem("qie_profile"),
};

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel);

const setBadge = (el: HTMLElement | null, text: string, tone?: "ok" | "muted" | "warn") => {
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("badge--ok", tone === "ok");
  el.classList.toggle("badge--warn", tone === "warn");
  el.classList.toggle("badge--muted", tone === "muted");
};

const elWalletBadge = $("#wallet-badge");
const elWalletAddr = $("#wallet-addr");
const elKycBadge = $("#kyc-badge");
const elKycWallet = $("#kyc-wallet") as HTMLInputElement | null;
const elKycRequest = $("#kyc-request");
const elKycLink = $("#kyc-link") as HTMLAnchorElement | null;
const elRegBadge = $("#reg-badge");
const elRegEmail = $("#reg-email") as HTMLInputElement | null;
const elRegWallet = $("#reg-wallet") as HTMLInputElement | null;
const elRegRouter = $("#reg-router") as HTMLInputElement | null;
const elRegStatus = $("#reg-status");
const elApiBase = $("#api-base");
const elApiBadge = $("#api-badge");
const elApiHealth = $("#api-health");

const elDashBadge = $("#dash-badge");
const elDashPayLink = $("#dash-paylink");
const elQrEmail = $("#qr-email") as HTMLInputElement | null;
const elQrOut = $("#qr-out");
const elQrBadge = $("#qr-badge");
const elResEmail = $("#res-email") as HTMLInputElement | null;
const elResOut = $("#res-out");

const refreshWallet = (addr?: string) => {
  const a = (addr ?? storage.getWallet()).trim();
  if (!a) {
    setBadge(elWalletBadge, "Not connected", "muted");
    if (elWalletAddr) elWalletAddr.textContent = "—";
    return;
  }
  setBadge(elWalletBadge, "Connected", "ok");
  if (elWalletAddr) elWalletAddr.textContent = a;
  if (elKycWallet && !elKycWallet.value) elKycWallet.value = a;
  if (elRegWallet && !elRegWallet.value) elRegWallet.value = a;
};

const refreshKyc = () => {
  const requestId = storage.getRequestId();
  if (!requestId) {
    setBadge(elKycBadge, "Not started", "muted");
    if (elKycRequest) elKycRequest.textContent = "Request ID: —";
    if (elKycLink) elKycLink.hidden = true;
    return;
  }
  setBadge(elKycBadge, "In progress", "warn");
  if (elKycRequest) elKycRequest.textContent = `Request ID: ${requestId}`;
};

const refreshProfile = () => {
  const p = storage.getProfile();
  if (!p) {
    setBadge(elRegBadge, "Not registered", "muted");
    setBadge(elDashBadge, "No profile", "muted");
    if (elDashPayLink) elDashPayLink.textContent = "qie:pay?target=—";
    return;
  }
  setBadge(elRegBadge, "Registered", "ok");
  setBadge(elDashBadge, "Ready", "ok");
  if (elDashPayLink) elDashPayLink.textContent = `qie:pay?target=${p.email}`;
  if (elQrEmail && !elQrEmail.value) elQrEmail.value = p.email;
  if (elRegEmail && !elRegEmail.value) elRegEmail.value = p.email;
  if (elRegWallet && !elRegWallet.value) elRegWallet.value = p.walletAddress;
  if (elRegRouter && !elRegRouter.value) elRegRouter.value = p.routerAddress;
};

$("#btn-connect")?.addEventListener("click", async () => {
  const eth = (window as any).ethereum;
  if (!eth?.request) {
    toast("No wallet detected (window.ethereum missing)");
    return;
  }
  try {
    const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
    const addr = (accounts?.[0] || "").toLowerCase();
    if (!addr) throw new Error("No accounts returned");
    storage.setWallet(addr);
    refreshWallet(addr);
    toast("Wallet connected");
  } catch (e: any) {
    toast(e?.message || "Failed to connect wallet");
  }
});

$("#btn-disconnect")?.addEventListener("click", () => {
  storage.clearWallet();
  storage.clearRequestId();
  refreshWallet("");
  refreshKyc();
  toast("Cleared local wallet + request");
});

$("#btn-health")?.addEventListener("click", async () => {
  try {
    setBadge(elApiBadge, "Checking…", "warn");
    const res = await apiFetch<{ status: string; service: string }>("/health");
    setBadge(elApiBadge, "Online", "ok");
    if (elApiHealth) elApiHealth.textContent = `${res.status} · ${res.service}`;
  } catch (e: any) {
    setBadge(elApiBadge, "Offline", "warn");
    if (elApiHealth) elApiHealth.textContent = e?.message || "Health check failed";
    toast("Backend not reachable");
  }
});

$("#btn-kyc-start")?.addEventListener("click", async () => {
  const walletAddress = (elKycWallet?.value || storage.getWallet()).trim();
  if (!walletAddress) {
    toast("Enter or connect a wallet address");
    return;
  }
  try {
    setBadge(elKycBadge, "Requesting…", "warn");
    const res = await apiFetch<{
      success: boolean;
      requestId: string;
      redirectUrl?: string;
      status?: string;
      userStatus?: string;
    }>("/api/kyc/request-verification", {
      method: "POST",
      body: JSON.stringify({ walletAddress }),
    });
    storage.setRequestId(res.requestId);
    refreshKyc();
    if (elKycLink && res.redirectUrl) {
      elKycLink.href = res.redirectUrl;
      elKycLink.hidden = false;
    }
    toast("Verification request created");
  } catch (e: any) {
    setBadge(elKycBadge, "Failed", "warn");
    toast(e?.message || "Failed to start verification");
  }
});

$("#btn-kyc-poll")?.addEventListener("click", async () => {
  const requestId = storage.getRequestId();
  if (!requestId) {
    toast("No requestId yet");
    return;
  }
  try {
    setBadge(elKycBadge, "Checking…", "warn");
    const res = await apiFetch<any>(`/api/kyc/status/${encodeURIComponent(requestId)}`);
    const status = res?.data?.status || res?.status || "Unknown";
    setBadge(elKycBadge, `Status: ${status}`, "ok");
    toast("Status updated");
  } catch (e: any) {
    setBadge(elKycBadge, "Status check failed", "warn");
    toast(e?.message || "Failed to check status");
  }
});

$("#btn-kyc-claim")?.addEventListener("click", async () => {
  const requestId = storage.getRequestId();
  if (!requestId) {
    toast("No requestId yet");
    return;
  }
  try {
    setBadge(elKycBadge, "Claiming…", "warn");
    const res = await apiFetch<any>("/api/kyc/claim", {
      method: "POST",
      body: JSON.stringify({ requestId }),
    });
    const ok = Boolean(res?.success);
    setBadge(elKycBadge, ok ? "Verified" : "Not verified", ok ? "ok" : "warn");
    toast(ok ? "KYC verified" : "Claimed (not verified)");
  } catch (e: any) {
    setBadge(elKycBadge, "Claim failed", "warn");
    toast(e?.message || "Failed to claim");
  }
});

$("#btn-register")?.addEventListener("click", async () => {
  const email = (elRegEmail?.value || "").trim();
  const walletAddress = (elRegWallet?.value || "").trim();
  const routerAddress = (elRegRouter?.value || "").trim();
  if (!email || !walletAddress || !routerAddress) {
    toast("Email, wallet, and router are required");
    return;
  }

  try {
    if (elRegStatus) elRegStatus.textContent = "Registering…";
    const res = await apiFetch<any>("/api/payments/register", {
      method: "POST",
      body: JSON.stringify({ email, walletAddress, routerAddress }),
    });
    if (elRegStatus) elRegStatus.textContent = res?.message || "Registered";
    storage.setProfile({ email: email.toLowerCase(), walletAddress: walletAddress.toLowerCase(), routerAddress: routerAddress.toLowerCase() });
    refreshProfile();
    toast("Pay profile registered");
  } catch (e: any) {
    if (elRegStatus) elRegStatus.textContent = e?.message || "Registration failed";
    toast("Registration failed");
  }
});

$("#btn-copy-link")?.addEventListener("click", async () => {
  const txt = elDashPayLink?.textContent || "";
  if (!txt || txt.endsWith("—")) {
    toast("No pay link to copy");
    return;
  }
  try {
    await navigator.clipboard.writeText(txt);
    toast("Copied");
  } catch {
    toast("Copy failed");
  }
});

$("#btn-qr")?.addEventListener("click", async () => {
  const email = (elQrEmail?.value || "").trim().toLowerCase();
  if (!email) {
    toast("Enter an email");
    return;
  }
  try {
    setBadge(elQrBadge, "Loading…", "warn");
    const res = await apiFetch<any>(`/api/payments/qr/${encodeURIComponent(email)}`);
    if (elQrOut) elQrOut.textContent = res?.qrUri || "—";
    setBadge(elQrBadge, "Ready", "ok");
    toast("QR payload generated");
  } catch (e: any) {
    setBadge(elQrBadge, "Failed", "warn");
    if (elQrOut) elQrOut.textContent = e?.message || "Failed";
    toast("QR request failed");
  }
});

$("#btn-resolve")?.addEventListener("click", async () => {
  const email = (elResEmail?.value || "").trim().toLowerCase();
  if (!email) {
    toast("Enter an email");
    return;
  }
  try {
    if (elResOut) elResOut.textContent = "Resolving…";
    const res = await apiFetch<any>(`/api/payments/resolve/${encodeURIComponent(email)}`);
    const routerAddress = res?.data?.routerAddress || "—";
    const walletAddress = res?.data?.walletAddress || "—";
    if (elResOut) elResOut.textContent = `Router: ${routerAddress}\nWallet: ${walletAddress}`;
    toast("Resolved");
  } catch (e: any) {
    if (elResOut) elResOut.textContent = e?.message || "Not found";
    toast("Resolve failed");
  }
});

const applyRoute = () => {
  const r = parseRoute();
  if (r.name === "home") {
    setView("home");
    scrollToSection(r.section);
    return;
  }
  setView(r.name);
  window.scrollTo({ top: 0, behavior: "auto" });
};

const boot = () => {
  if (elApiBase) elApiBase.textContent = apiBase;
  setBadge(elApiBadge, "Unknown", "muted");
  refreshWallet();
  refreshKyc();
  refreshProfile();
  observeReveals(document);
  applyRoute();
};

window.addEventListener("hashchange", applyRoute);
boot();
