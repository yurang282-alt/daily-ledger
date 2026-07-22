(function configureMoneyRockyIdentity(root) {
  "use strict";

  root.ROCKY_APP_SSO_CONFIG = Object.freeze({
    enabled: true,
    appId: "money",
    returnRoot: "/apps/ledger/",
    entry: "./app.js?v=20260722-sso-v1",
    entryType: "classic",
    dependencies: [
      "./config.js?v=20260722-sso-v1",
      "./pwa-cleanup.js?v=20260722-sso-v1",
    ],
    timeoutMs: 8000,
  });
})(window);
