window.APP_CONFIG = {
  supabaseUrl: "https://hnlpjroavixkwhymanmu.supabase.co",
  supabaseAnonKey: "sb_publishable_09JhpElaWE7YRPgMupCepA_CUanSZhZ",
};

(function dailyLedgerRuntimePatch() {
  const authStorageKey = "daily-ledger-supabase-auth";
  let supabaseNamespace;
  let handledRedirect = false;

  Object.defineProperty(window, "supabase", {
    configurable: true,
    get() {
      return supabaseNamespace;
    },
    set(nextNamespace) {
      supabaseNamespace = patchNamespace(nextNamespace);
    },
  });

  function patchNamespace(namespace) {
    if (!namespace || namespace.__dailyLedgerPatched) return namespace;
    const createClient = namespace.createClient.bind(namespace);
    namespace.createClient = (...args) => {
      const client = createClient(args[0], args[1], {
        ...(args[2] || {}),
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: authStorageKey,
          ...((args[2] || {}).auth || {}),
        },
      });
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

  async function exchangeCodeOnce(client) {
    if (handledRedirect) return;
    handledRedirect = true;
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (!code || !client?.auth?.exchangeCodeForSession) return;
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    url.searchParams.delete("code");
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }

  window.addEventListener("DOMContentLoaded", () => {
    installOtpLogin();
    installExpenseOnlyMode();
    installMobileExperience();
  });

  function getClient() {
    if (window.__dailyLedgerSupabaseClient) return window.__dailyLedgerSupabaseClient;
    if (!window.supabase?.createClient) return null;
    return window.supabase.createClient(window.APP_CONFIG.supabaseUrl, window.APP_CONFIG.supabaseAnonKey);
  }

  function showMessage(message, kind = "info") {
    if (typeof window.showNotice === "function") return window.showNotice(message, kind);
    const notice = document.querySelector("#syncNotice");
    const text = document.querySelector("#syncMessage");
    if (!notice || !text) return;
    text.textContent = message;
    notice.classList.remove("is-hidden", "is-success", "is-error");
    notice.classList.toggle("is-success", kind === "success");
    notice.classList.toggle("is-error", kind === "error");
  }

  function installOtpLogin() {
    const panel = document.querySelector("#authPanel");
    const sendButton = document.querySelector("#sendLogin");
    if (!panel || !sendButton) return;

    let codeInput = document.querySelector("#authCode");
    let verifyButton = document.querySelector("#verifyLogin");
    if (!codeInput) {
      codeInput = document.createElement("input");
      codeInput.className = "is-hidden";
      codeInput.id = "authCode";
      codeInput.type = "text";
      codeInput.inputMode = "numeric";
      codeInput.autocomplete = "one-time-code";
      codeInput.maxLength = 6;
      codeInput.placeholder = "6 位验证码";
      codeInput.style.width = "110px";
      codeInput.style.textAlign = "center";
      sendButton.insertAdjacentElement("afterend", codeInput);
    }
    if (!verifyButton) {
      verifyButton = document.createElement("button");
      verifyButton.className = "secondary-button is-hidden";
      verifyButton.id = "verifyLogin";
      verifyButton.type = "button";
      verifyButton.textContent = "验证登录";
      codeInput.insertAdjacentElement("afterend", verifyButton);
    }

    sendButton.addEventListener("click", sendOtp, true);
    verifyButton.addEventListener("click", verifyOtp);
    codeInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        verifyOtp();
      }
    });
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
    if (!email) return emailInput.focus();

    sendButton.disabled = true;
    sendButton.textContent = "发送中";
    const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    sendButton.disabled = false;
    sendButton.textContent = "发送验证码";
    if (error) return showMessage(`验证码发送失败：${error.message}`, "error");

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
    if (!email) return emailInput.focus();
    if (!token || token.length < 6) return codeInput.focus();

    verifyButton.disabled = true;
    verifyButton.textContent = "验证中";
    const { error } = await client.auth.verifyOtp({ email, token, type: "email" });
    verifyButton.disabled = false;
    verifyButton.textContent = "验证登录";
    if (error) return showMessage(`登录失败：${error.message}`, "error");

    showMessage("登录成功，正在同步云端数据。", "success");
    window.setTimeout(() => window.location.reload(), 600);
  }

  function installExpenseOnlyMode() {
    const apply = () => {
      document.querySelector("#incomeTotal")?.closest(".metric")?.remove();
      document.querySelector("#balanceTotal")?.closest(".metric")?.remove();
      document.querySelector('[data-entry-type="income"]')?.remove();
      document.querySelector('[data-entry-type="expense"]')?.closest(".segmented")?.remove();
      document.querySelectorAll(".tag.income").forEach((tag) => tag.closest(".record-row")?.remove());
      document.querySelectorAll(".record-amount.income").forEach((amount) => amount.closest(".record-row")?.remove());
    };
    apply();
    new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
  }

  function installMobileExperience() {
    injectMobileStyles();
    installMobileFab();
    installMobileChartTabs();
    observeCategoryRanks();
  }

  function injectMobileStyles() {
    if (document.querySelector("#dailyLedgerMobileStyles")) return;
    const style = document.createElement("style");
    style.id = "dailyLedgerMobileStyles";
    style.textContent = `
      .mobile-chart-tabs, .mobile-add-button { display: none; }
      @media (max-width: 680px) {
        body { padding-bottom: calc(88px + env(safe-area-inset-bottom)); }
        .app-shell { width: min(100% - 20px, 1180px); padding-top: 14px; }
        h1 { font-size: 30px; }
        .topbar { gap: 12px; }
        .summary-grid { grid-template-columns: 1fr; gap: 10px; margin-bottom: 12px; }
        .metric { min-height: auto; padding: 14px; }
        .metric strong { font-size: 23px; }
        .workspace { gap: 12px; }
        .entry-panel { display: block !important; position: static !important; max-height: none !important; overflow: visible !important; padding: 14px !important; border-radius: 8px !important; transform: none !important; box-shadow: var(--shadow) !important; }
        #amountInput { min-height: 56px; font-size: 28px; font-weight: 900; }
        .field-row { display: grid; grid-template-columns: 1fr auto; }
        .analysis-panel, .list-panel { padding: 14px; }
        .mobile-chart-tabs { display: grid; grid-template-columns: 1fr 1fr; margin-bottom: 12px; padding: 4px; border-radius: 8px; background: var(--surface-soft); }
        .charts-grid { display: block; }
        .chart-block[data-chart-panel] { display: none; min-height: 0; padding: 0; border: 0; box-shadow: none; }
        .chart-block[data-chart-panel].is-active { display: block; }
        .donut { display: none; }
        .donut-wrap { display: block; }
        .legend { gap: 12px; max-height: none; overflow: visible; }
        .legend li { position: relative; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; padding: 0 0 14px; font-size: 14px; }
        .legend li::before, .legend li::after { content: ""; position: absolute; left: 0; bottom: 0; height: 6px; border-radius: 999px; }
        .legend li::before { right: 0; background: var(--surface-soft); }
        .legend li::after { right: calc(100% - var(--rank-size, 0%)); z-index: 1; background: var(--green); }
        .legend li.empty-state { display: block; padding: 0; }
        .legend li.empty-state::before, .legend li.empty-state::after { display: none; }
        .legend i { display: none; }
        .legend b { grid-column: 1; }
        .legend span { grid-column: 2; }
        .bar-chart { height: 190px; gap: 3px; }
        .bar:hover::after { display: none; }
        .record-row { align-items: flex-start; padding: 13px 0; }
        .record-amount > div { display: none; }
        .mobile-add-button { width: 58px; height: 58px; display: grid; place-items: center; position: fixed; right: 18px; bottom: calc(18px + env(safe-area-inset-bottom)); z-index: 30; border: 0; border-radius: 18px; background: var(--green); color: #fff; box-shadow: 0 14px 28px rgba(32, 120, 90, 0.32); font-size: 32px; line-height: 1; }
        .mobile-sheet-backdrop { display: none !important; }
      }
    `;
    document.head.append(style);
  }

  function installMobileFab() {
    let addButton = document.querySelector("#mobileAddRecord");
    if (!addButton) {
      addButton = document.createElement("button");
      addButton.className = "mobile-add-button";
      addButton.id = "mobileAddRecord";
      addButton.type = "button";
      addButton.setAttribute("aria-label", "记一笔");
      addButton.textContent = "＋";
      document.body.append(addButton);
    }
    addButton.addEventListener("click", () => {
      const form = document.querySelector("#entryForm");
      const amountInput = document.querySelector("#amountInput");
      form?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => amountInput?.focus(), 180);
    });
  }

  function installMobileChartTabs() {
    const chartsGrid = document.querySelector(".charts-grid");
    const chartBlocks = [...document.querySelectorAll(".chart-block")];
    if (!chartsGrid || chartBlocks.length < 2) return;
    chartBlocks[0].setAttribute("data-chart-panel", "category");
    chartBlocks[1].setAttribute("data-chart-panel", "trend");
    if (!document.querySelector(".mobile-chart-tabs")) {
      const tabs = document.createElement("div");
      tabs.className = "mobile-chart-tabs";
      tabs.innerHTML = '<button class="segment is-active" type="button" data-chart-tab="category">分类</button><button class="segment" type="button" data-chart-tab="trend">趋势</button>';
      chartsGrid.before(tabs);
    }
    const setActive = (name) => {
      document.querySelectorAll("[data-chart-tab]").forEach((button) => button.classList.toggle("is-active", button.dataset.chartTab === name));
      document.querySelectorAll("[data-chart-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.chartPanel === name));
    };
    document.querySelectorAll("[data-chart-tab]").forEach((button) => button.addEventListener("click", () => setActive(button.dataset.chartTab)));
    setActive("category");
  }

  function observeCategoryRanks() {
    const legend = document.querySelector("#categoryLegend");
    if (!legend) return;
    const applyRanks = () => {
      legend.querySelectorAll("li").forEach((item) => {
        const percent = Number.parseInt(item.querySelector("span")?.textContent || "", 10);
        if (Number.isFinite(percent)) item.style.setProperty("--rank-size", `${percent}%`);
      });
    };
    applyRanks();
    new MutationObserver(applyRanks).observe(legend, { childList: true, subtree: true });
  }
})();
