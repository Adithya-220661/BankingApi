// this is new file for cookie box setup
(function () {
  const STORAGE_KEY = "hb_cookie_consent_v1";
  const COOKIE_NAME = "hb_cookie_consent";
  const DEMO_SHOW_EVERY_LOAD = true;

  function safeJsonParse(value) {
    try { return JSON.parse(value); } catch { return null; }
  }

  function getCookie(name) {
    const parts = document.cookie ? document.cookie.split("; ") : [];
    for (const part of parts) {
      const eq = part.indexOf("=");
      const key = eq >= 0 ? part.slice(0, eq) : part;
      if (key === name) return eq >= 0 ? decodeURIComponent(part.slice(eq + 1)) : "";
    }
    return null;
  }

  function getDemoFlags() {
    try {
      const params = new URLSearchParams(window.location.search);
      return {
        demo: params.get("cookieDemo") === "1",
        reset: params.get("cookieReset") === "1",
      };
    } catch {
      return { demo: false, reset: false };
    }
  }

  function getStoredConsent() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const fromStorage = safeJsonParse(raw);
    if (fromStorage && typeof fromStorage.necessary === "boolean") return fromStorage;

    const cookieRaw = getCookie(COOKIE_NAME);
    const fromCookie = cookieRaw ? safeJsonParse(cookieRaw) : null;
    if (fromCookie && typeof fromCookie.necessary === "boolean") return fromCookie;

    return null;
  }

  function persistConsent(consent) {
    const payload = {
      version: 1,
      necessary: true,
      analytics: !!consent.analytics,
      marketing: !!consent.marketing,
      savedAt: new Date().toISOString(),
    };

    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch {}
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(payload))}; Max-Age=31536000; Path=/; SameSite=Lax`;
    return payload;
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.hidden = hidden;
    el.setAttribute("aria-hidden", hidden ? "true" : "false");
  }

  document.addEventListener("DOMContentLoaded", () => {
    const banner = document.getElementById("cookieConsent");
    const settings = document.getElementById("cookieSettings");
    const analyticsCheckbox = document.getElementById("cookieAnalytics");
    const marketingCheckbox = document.getElementById("cookieMarketing");
    const manageLink = document.getElementById("openCookieSettings");
    const logoSplash = document.getElementById("logoSplash");

    if (!banner || !settings) return;

    const flags = getDemoFlags();
    if (flags.reset) {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
    }

    const existing = getStoredConsent();
    setHidden(settings, true);
    const shouldShowBanner = DEMO_SHOW_EVERY_LOAD || flags.demo || !existing;
    setHidden(banner, true);
    window.__hbCookieConsentLoaded = true;

    let previousBodyOverflow = "";

    function openSettings() {
      const current = getStoredConsent();
      if (analyticsCheckbox) analyticsCheckbox.checked = !!(current && current.analytics);
      if (marketingCheckbox) marketingCheckbox.checked = !!(current && current.marketing);

      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      setHidden(settings, false);
    }

    function closeSettings() {
      document.body.style.overflow = previousBodyOverflow;
      setHidden(settings, true);
    }

    function acceptAll() {
      persistConsent({ analytics: true, marketing: true });
      closeSettings();
      setHidden(banner, true);
    }

    function necessaryOnly() {
      persistConsent({ analytics: false, marketing: false });
      closeSettings();
      setHidden(banner, true);
    }

    function saveSettings() {
      persistConsent({
        analytics: !!(analyticsCheckbox && analyticsCheckbox.checked),
        marketing: !!(marketingCheckbox && marketingCheckbox.checked),
      });
      closeSettings();
      setHidden(banner, true);
    }

    function showBannerAfterLogo() {
      if (!shouldShowBanner) return;

      let shown = false;
      const show = () => {
        if (shown) return;
        shown = true;
        setHidden(banner, false);
      };
      setTimeout(show, 5000);
      if (!logoSplash) {
        show();
        return;
      }

      const maybeShowAfterFade = () => {
        if (shown) return;
        if (logoSplash.classList && logoSplash.classList.contains("fadeOut")) {
          setTimeout(show, 1200);
        }
      };

      maybeShowAfterFade();

      try {
        const obs = new MutationObserver(() => {
          const splashGone =
            logoSplash.style.display === "none" ||
            logoSplash.hidden === true ||
            logoSplash.getClientRects().length === 0;

          if (splashGone) {
            show();
            obs.disconnect();
            return;
          }
          maybeShowAfterFade();
        });

        obs.observe(logoSplash, { attributes: true, attributeFilter: ["class", "style", "hidden"] });
      } catch {
      }
    }

    banner.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest ? e.target.closest("[data-cookie-action]") : null;
      if (!btn) return;
      const action = btn.getAttribute("data-cookie-action");
      if (action === "accept_all") acceptAll();
      if (action === "necessary_only") necessaryOnly();
      if (action === "settings") openSettings();
    });

    settings.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest ? e.target.closest("[data-cookie-action]") : null;
      if (!btn) return;
      const action = btn.getAttribute("data-cookie-action");
      if (action === "close_settings") closeSettings();
      if (action === "reject_optional") necessaryOnly();
      if (action === "save_settings") saveSettings();
    });

    if (manageLink) {
      manageLink.addEventListener("click", (e) => {
        e.preventDefault();
        openSettings();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !settings.hidden) closeSettings();
    });

    showBannerAfterLogo();
  });
})();
