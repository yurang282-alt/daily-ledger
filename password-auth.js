(function installPasswordAuth() {
  const authBackupKey = "daily-ledger-auth-session-backup-v1";

  function getClient() {
    if (window.__dailyLedgerSupabaseClient) return window.__dailyLedgerSupabaseClient;
    if (!window.supabase?.createClient || !window.APP_CONFIG?.supabaseUrl || !window.APP_CONFIG?.supabaseAnonKey) return null;
    return window.supabase.createClient(window.APP_CONFIG.supabaseUrl, window.APP_CONFIG.supabaseAnonKey);
  }

  function saveSessionBackup(session) {
    if (!session?.access_token || !session?.refresh_token) return;
    localStorage.setItem(
      authBackupKey,
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at || 0,
        email: session.user?.email || "",
      }),
    );
  }

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

  function syncVisibility() {
    const emailInput = document.querySelector("#authEmail");
    const passwordInput = document.querySelector("#authPassword");
    const loginButton = document.querySelector("#passwordLogin");
    const signupButton = document.querySelector("#passwordSignup");
    const shouldHide = !emailInput || emailInput.classList.contains("is-hidden");
    [passwordInput, loginButton, signupButton].forEach((item) => item?.classList.toggle("is-hidden", shouldHide));
  }

  function ensurePasswordControls() {
    const panel = document.querySelector("#authPanel");
    const emailInput = document.querySelector("#authEmail");
    const sendButton = document.querySelector("#sendLogin");
    if (!panel || !emailInput || !sendButton || document.querySelector("#authPassword")) return;

    const passwordInput = document.createElement("input");
    passwordInput.id = "authPassword";
    passwordInput.type = "password";
    passwordInput.autocomplete = "current-password";
    passwordInput.placeholder = "密码";
    passwordInput.minLength = 6;

    const loginButton = document.createElement("button");
    loginButton.className = "secondary-button";
    loginButton.id = "passwordLogin";
    loginButton.type = "button";
    loginButton.textContent = "密码登录";

    const signupButton = document.createElement("button");
    signupButton.className = "plain-button";
    signupButton.id = "passwordSignup";
    signupButton.type = "button";
    signupButton.textContent = "注册/设置密码";

    panel.insertBefore(passwordInput, sendButton);
    passwordInput.insertAdjacentElement("afterend", loginButton);
    loginButton.insertAdjacentElement("afterend", signupButton);
    sendButton.textContent = "验证码备用";

    loginButton.addEventListener("click", signInWithPassword);
    signupButton.addEventListener("click", signUpOrSetPassword);
    passwordInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        signInWithPassword();
      }
    });
    syncVisibility();
  }

  async function signInWithPassword() {
    const emailInput = document.querySelector("#authEmail");
    const passwordInput = document.querySelector("#authPassword");
    const loginButton = document.querySelector("#passwordLogin");
    const client = getClient();
    const email = emailInput?.value.trim();
    const password = passwordInput?.value || "";
    if (!emailInput || !passwordInput || !loginButton || !client) return;
    if (!email) return emailInput.focus();
    if (password.length < 6) return passwordInput.focus();

    loginButton.disabled = true;
    loginButton.textContent = "登录中";
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    loginButton.disabled = false;
    loginButton.textContent = "密码登录";

    if (error) {
      showMessage(`登录失败：${error.message}`, "error");
      return;
    }
    saveSessionBackup(data?.session);
    showMessage("登录成功，正在同步云端数据。", "success");
    window.setTimeout(() => window.location.reload(), 500);
  }

  async function signUpOrSetPassword() {
    const emailInput = document.querySelector("#authEmail");
    const passwordInput = document.querySelector("#authPassword");
    const signupButton = document.querySelector("#passwordSignup");
    const client = getClient();
    const email = emailInput?.value.trim();
    const password = passwordInput?.value || "";
    if (!emailInput || !passwordInput || !signupButton || !client) return;
    if (!email) return emailInput.focus();
    if (password.length < 6) return passwordInput.focus();

    signupButton.disabled = true;
    signupButton.textContent = "处理中";

    const current = await client.auth.getSession();
    if (current.data?.session) {
      const { data, error } = await client.auth.updateUser({ password });
      signupButton.disabled = false;
      signupButton.textContent = "注册/设置密码";
      if (error) {
        showMessage(`设置失败：${error.message}`, "error");
        return;
      }
      saveSessionBackup(data?.session || current.data.session);
      passwordInput.value = "";
      showMessage("密码已设置好。以后可以直接用邮箱和密码登录。", "success");
      return;
    }

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.href.split("#")[0] },
    });
    signupButton.disabled = false;
    signupButton.textContent = "注册/设置密码";

    if (error) {
      showMessage(`设置失败：${error.message}`, "error");
      return;
    }
    saveSessionBackup(data?.session);
    if (data?.session) {
      showMessage("密码已设置，正在同步云端数据。", "success");
      window.setTimeout(() => window.location.reload(), 500);
    } else {
      showMessage("已发送确认邮件。确认后就可以用密码登录。", "success");
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    ensurePasswordControls();
    new MutationObserver(syncVisibility).observe(document.body, { attributes: true, childList: true, subtree: true });
  });
})();
