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
    document.querySelector("#sendLogin")?.addEventListener("click", sendOtp, true);
    document.querySelector("#verifyLogin")?.addEventListener("click", verifyOtp);
    document.querySelector("#authCode")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        verifyOtp();
      }
    });
  });
})();
