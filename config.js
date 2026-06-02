window.APP_CONFIG = {
  supabaseUrl: "https://hnlpjroavixkwhymanmu.supabase.co",
  supabaseAnonKey: "sb_publishable_09JhpElaWE7YRPgMupCepA_CUanSZhZ",
};

(function dailyLedgerSafeRuntimePatch() {
  const authStorageKey = "daily-ledger-supabase-auth";
  const authBackupKey = "daily-ledger-auth-session-backup-v1";
  let supabaseNamespace;
  let handledRedirect = false;

  ensureLegacyMetricCompatibility();
  window.addEventListener("DOMContentLoaded", ensureLegacyMetricCompatibility);

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
        await restoreSessionFromBackup(client, getSession);
        return getSession(...sessionArgs);
      };

      client.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") {
          localStorage.removeItem(authBackupKey);
          return;
        }
        saveSessionBackup(session);
      });

      return client;
    };
    namespace.__dailyLedgerPatched = true;
    return namespace;
  }

  function ensureLegacyMetricCompatibility() {
    const summary = document.querySelector(".summary-grid");
    if (!summary) return;

    ["incomeTotal", "balanceTotal"].forEach((id) => {
      if (document.querySelector(`#${id}`)) return;
      const article = document.createElement("article");
      article.className = "metric daily-ledger-compat-metric";
      article.hidden = true;
      article.style.display = "none";
      article.innerHTML = `<span></span><strong id="${id}">¥0.00</strong>`;
      summary.append(article);
    });
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

  async function restoreSessionFromBackup(client, getSession) {
    if (client.__dailyLedgerSessionRestored) return;
    client.__dailyLedgerSessionRestored = true;

    const current = await getSession();
    if (current.data?.session) {
      saveSessionBackup(current.data.session);
      return;
    }

    try {
      const backup = JSON.parse(localStorage.getItem(authBackupKey) || "null");
      if (!backup?.access_token || !backup?.refresh_token) return;
      const { data, error } = await client.auth.setSession({
        access_token: backup.access_token,
        refresh_token: backup.refresh_token,
      });
      if (error) throw error;
      saveSessionBackup(data?.session);
    } catch {
      localStorage.removeItem(authBackupKey);
    }
  }

  async function exchangeCodeOnce(client) {
    if (handledRedirect) return;
    handledRedirect = true;
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (!code || !client?.auth?.exchangeCodeForSession) return;

    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    saveSessionBackup(data?.session);

    url.searchParams.delete("code");
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }
})();
