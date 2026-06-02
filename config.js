window.APP_CONFIG = {
  supabaseUrl: "https://hnlpjroavixkwhymanmu.supabase.co",
  supabaseAnonKey: "sb_publishable_09JhpElaWE7YRPgMupCepA_CUanSZhZ",
};

(function patchSupabaseAuthRedirect() {
  let supabaseNamespace;
  let handled = false;
  const authStorageKey = "daily-ledger-supabase-auth";

  async function exchangeCodeOnce(client) {
    if (handled) return;
    handled = true;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (!code || !client?.auth?.exchangeCodeForSession) return;

    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;

    url.searchParams.delete("code");
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }

  function patchNamespace(namespace) {
    if (!namespace || namespace.__dailyLedgerPatched) return namespace;

    const createClient = namespace.createClient.bind(namespace);
    namespace.createClient = (...args) => {
      const options = {
        ...(args[2] || {}),
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: authStorageKey,
          ...((args[2] || {}).auth || {}),
        },
      };
      const client = createClient(args[0], args[1], options);
      window.__dailyLedgerSupabaseClient = client;
      const getSession = client.auth.getSession.bind(client.auth);

      client.auth.getSession = async (...sessionArgs) => {
        await exchangeCodeOnce(client);
        return getSession(...sessionArgs);
      };

      return client;
    };

    namespace.__dailyLedgerPatched = true;
    return namespace;
  }

  Object.defineProperty(window, "supabase", {
    configurable: true,
    get() {
      return supabaseNamespace;
    },
    set(nextNamespace) {
      supabaseNamespace = patchNamespace(nextNamespace);
    },
  });

  function showMessage(message, kind = "info") {
    if (typeof window.showNotice === "function") {
      window.showNotice(message, kind);
      return;
    }

    const notice = document.querySelector("#syncNotice");
    const text = document.querySelector("#syncMessage");
    if (!notice || !text) return;
    text.textContent = message;
    notice.classList.remove("is-hidden", "is-success", "is-error");
    notice.classList.toggle("is-success", kind === "success");
    notice.classList.toggle("is-error", kind === "error");
  }

  function ensureOtpControls() {
    const panel = document.querySelector("#authPanel");
    const sendButton = document.querySelector("#sendLogin");
    if (!panel || !sendButton || document.querySelector("#authCode")) return;

    const codeInput = document.createElement("input");
    codeInput.className = "is-hidden";
    codeInput.id = "authCode";
    codeInput.type = "text";
    codeInput.inputMode = "numeric";
    codeInput.autocomplete = "one-time-code";
    codeInput.maxLength = 6;
    codeInput.placeholder = "6 位验证码";
    codeInput.style.width = "110px";
    codeInput.style.textAlign = "center";

    const verifyButton = document.createElement("button");
    verifyButton.className = "secondary-button is-hidden";
    verifyButton.id = "verifyLogin";
    verifyButton.type = "button";
    verifyButton.textContent = "验证登录";

    sendButton.insertAdjacentElement("afterend", verifyButton);
    sendButton.insertAdjacentElement("afterend", codeInput);
  }

  function getClient() {
    if (window.__dailyLedgerSupabaseClient) return window.__dailyLedgerSupabaseClient;
    if (!window.supabase?.createClient) return null;
    return window.supabase.createClient(window.APP_CONFIG.supabaseUrl, window.APP_CONFIG.supabaseAnonKey);
  }

  async function sendOtp(event) {
    const sendButton = document.querySelector("#sendLogin");
    const emailInput = document.querySelector("#authEmail");
    const codeInput = document.querySelector("#authCode");
    const verifyButton = document.querySelector("#verifyLogin");
    const email = emailInput?.value.trim();
    const client = getClient();

    if (!sendButton || !emailInput || !codeInput || !verifyButton || !client) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    if (!email) {
      emailInput.focus();
      return;
    }

    sendButton.disabled = true;
    sendButton.textContent = "发送中";
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    sendButton.disabled = false;
    sendButton.textContent = "发送验证码";

    if (error) {
      showMessage(`验证码发送失败：${error.message}`, "error");
      return;
    }

    codeInput.classList.remove("is-hidden");
    verifyButton.classList.remove("is-hidden");
    codeInput.value = "";
    codeInput.focus();
    showMessage("验证码已发送，请在这里输入邮件里的 6 位验证码。");
  }

  async function verifyOtp() {
    const emailInput = document.querySelector("#authEmail");
    const codeInput = document.querySelector("#authCode");
    const verifyButton = document.querySelector("#verifyLogin");
    const email = emailInput?.value.trim();
    const token = codeInput?.value.trim();
    const client = getClient();

    if (!emailInput || !codeInput || !verifyButton || !client) return;
    if (!email) {
      emailInput.focus();
      return;
    }
    if (!token || token.length < 6) {
      codeInput.focus();
      return;
    }

    verifyButton.disabled = true;
    verifyButton.textContent = "验证中";
    const { error } = await client.auth.verifyOtp({ email, token, type: "email" });
    verifyButton.disabled = false;
    verifyButton.textContent = "验证登录";

    if (error) {
      showMessage(`登录失败：${error.message}`, "error");
      return;
    }

    showMessage("登录成功，正在同步云端数据。", "success");
    window.setTimeout(() => window.location.reload(), 600);
  }

  window.addEventListener("DOMContentLoaded", () => {
    ensureOtpControls();
    installMobileExperience();
    document.querySelector("#sendLogin")?.addEventListener("click", sendOtp, true);
    document.querySelector("#verifyLogin")?.addEventListener("click", verifyOtp);
    document.querySelector("#authCode")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        verifyOtp();
      }
    });
  });

  function installMobileExperience() {
    injectMobileStyles();
    ensureMobileControls();
    wireMobileEntrySheet();
    wireMobileChartTabs();
    observeCategoryRanks();
  }

  function injectMobileStyles() {
    if (document.querySelector("#dailyLedgerMobileStyles")) return;

    const style = document.createElement("style");
    style.id = "dailyLedgerMobileStyles";
    style.textContent = `
      .mobile-chart-tabs,
      .mobile-add-button,
      .mobile-sheet-backdrop { display: none; }
      @media (max-width: 680px) {
        body { padding-bottom: calc(88px + env(safe-area-inset-bottom)); }
        .app-shell { width: min(100% - 20px, 1180px); padding-top: 14px; }
        h1 { font-size: 30px; }
        .topbar { gap: 12px; }
        .summary-grid { gap: 10px; margin-bottom: 12px; }
        .metric { min-height: auto; padding: 14px; }
        .metric strong { font-size: 23px; }
        .workspace { gap: 12px; }
        .entry-panel {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 40;
          max-height: min(86vh, 690px);
          overflow: auto;
          padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
          border-right: 0;
          border-bottom: 0;
          border-left: 0;
          border-radius: 16px 16px 0 0;
          box-shadow: 0 -18px 45px rgba(24, 33, 29, 0.18);
          transform: translateY(calc(100% + 18px));
          transition: transform 220ms ease;
        }
        .mobile-entry-open .entry-panel { transform: translateY(0); }
        .entry-panel .panel-title { align-items: start; margin-bottom: 14px; }
        #amountInput { min-height: 56px; font-size: 28px; font-weight: 900; }
        .field-row { display: grid; grid-template-columns: 1fr auto; }
        .analysis-panel,
        .list-panel { padding: 14px; }
        .mobile-chart-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          margin-bottom: 12px;
          padding: 4px;
          border-radius: 8px;
          background: var(--surface-soft);
        }
        .charts-grid { display: block; }
        .chart-block[data-chart-panel] {
          display: none;
          min-height: 0;
          padding: 0;
          border: 0;
          box-shadow: none;
        }
        .chart-block[data-chart-panel].is-active { display: block; }
        .donut { display: none; }
        .donut-wrap { display: block; }
        .legend { gap: 12px; max-height: none; overflow: visible; }
        .legend li {
          position: relative;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px 12px;
          padding: 0 0 14px;
          font-size: 14px;
        }
        .legend li::before,
        .legend li::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 0;
          height: 6px;
          border-radius: 999px;
        }
        .legend li::before { right: 0; background: var(--surface-soft); }
        .legend li::after {
          right: calc(100% - var(--rank-size, 0%));
          z-index: 1;
          background: var(--green);
        }
        .legend li.empty-state { display: block; padding: 0; }
        .legend li.empty-state::before,
        .legend li.empty-state::after { display: none; }
        .legend i { display: none; }
        .legend b { grid-column: 1; }
        .legend span { grid-column: 2; }
        .bar-chart { height: 190px; gap: 3px; }
        .bar:hover::after { display: none; }
        .record-row { align-items: flex-start; padding: 13px 0; }
        .record-amount > div { display: none; }
        .mobile-add-button {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          position: fixed;
          right: 18px;
          bottom: calc(18px + env(safe-area-inset-bottom));
          z-index: 30;
          border: 0;
          border-radius: 18px;
          background: var(--green);
          color: #fff;
          box-shadow: 0 14px 28px rgba(32, 120, 90, 0.32);
          font-size: 32px;
          line-height: 1;
        }
        .mobile-entry-open .mobile-add-button { display: none; }
        .mobile-sheet-backdrop {
          position: fixed;
          inset: 0;
          z-index: 35;
          background: rgba(24, 33, 29, 0.34);
          opacity: 0;
          pointer-events: none;
          transition: opacity 180ms ease;
        }
        .mobile-entry-open .mobile-sheet-backdrop {
          display: block;
          opacity: 1;
          pointer-events: auto;
        }
      }
    `;
    document.head.append(style);
  }

  function ensureMobileControls() {
    const analysisPanel = document.querySelector(".analysis-panel");
    const chartsGrid = document.querySelector(".charts-grid");
    const chartBlocks = [...document.querySelectorAll(".chart-block")];
    if (analysisPanel && chartsGrid && !document.querySelector(".mobile-chart-tabs")) {
      const tabs = document.createElement("div");
      tabs.className = "mobile-chart-tabs";
      tabs.setAttribute("role", "tablist");
      tabs.setAttribute("aria-label", "手机端统计视图");
      tabs.innerHTML = `
        <button class="segment is-active" type="button" data-chart-tab="category">分类</button>
        <button class="segment" type="button" data-chart-tab="trend">趋势</button>
      `;
      chartsGrid.before(tabs);
    }
    chartBlocks[0]?.setAttribute("data-chart-panel", "category");
    chartBlocks[1]?.setAttribute("data-chart-panel", "trend");
    chartBlocks[0]?.classList.add("is-active");

    if (!document.querySelector("#mobileAddRecord")) {
      const addButton = document.createElement("button");
      addButton.className = "mobile-add-button";
      addButton.id = "mobileAddRecord";
      addButton.type = "button";
      addButton.setAttribute("aria-label", "记一笔");
      addButton.textContent = "＋";
      document.body.append(addButton);
    }

    if (!document.querySelector("#mobileSheetBackdrop")) {
      const backdrop = document.createElement("div");
      backdrop.className = "mobile-sheet-backdrop";
      backdrop.id = "mobileSheetBackdrop";
      backdrop.setAttribute("aria-hidden", "true");
      document.body.append(backdrop);
    }
  }

  function wireMobileEntrySheet() {
    const form = document.querySelector("#entryForm");
    const amountInput = document.querySelector("#amountInput");
    const saveButton = document.querySelector("#entryForm .primary-button");
    const open = () => {
      document.body.classList.add("mobile-entry-open");
      form?.setAttribute("aria-modal", "true");
      window.setTimeout(() => amountInput?.focus(), 120);
    };
    const close = () => {
      document.body.classList.remove("mobile-entry-open");
      form?.removeAttribute("aria-modal");
      saveButton && (saveButton.textContent = "保存");
    };

    document.querySelector("#mobileAddRecord")?.addEventListener("click", open);
    document.querySelector("#mobileSheetBackdrop")?.addEventListener("click", close);
    form?.addEventListener("submit", () => window.setTimeout(close, 900));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
    document.addEventListener("click", (event) => {
      if (event.target?.matches?.(".delete-button:first-child")) {
        window.setTimeout(open, 30);
      }
    });
  }

  function wireMobileChartTabs() {
    const setActive = (name) => {
      document.querySelectorAll("[data-chart-tab]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.chartTab === name);
      });
      document.querySelectorAll("[data-chart-panel]").forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.chartPanel === name);
      });
    };

    document.querySelectorAll("[data-chart-tab]").forEach((button) => {
      button.addEventListener("click", () => setActive(button.dataset.chartTab));
    });
    setActive("category");
  }

  function observeCategoryRanks() {
    const legend = document.querySelector("#categoryLegend");
    if (!legend) return;

    const applyRanks = () => {
      legend.querySelectorAll("li").forEach((item) => {
        const text = item.querySelector("span")?.textContent || "";
        const percent = Number.parseInt(text, 10);
        if (Number.isFinite(percent)) {
          item.style.setProperty("--rank-size", `${percent}%`);
        }
      });
    };

    applyRanks();
    new MutationObserver(applyRanks).observe(legend, { childList: true, subtree: true });
  }
})();
