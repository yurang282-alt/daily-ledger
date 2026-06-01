window.APP_CONFIG = {
  supabaseUrl: "https://hnlpjroavixkwhymanmu.supabase.co",
  supabaseAnonKey: "sb_publishable_09JhpElaWE7YRPgMupCepA_CUanSZhZ",
};

(function patchSupabaseAuthRedirect() {
  let supabaseNamespace;
  let handled = false;

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
      const client = createClient(...args);
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
})();
