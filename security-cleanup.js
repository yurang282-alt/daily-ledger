(function cleanOnlyDailyLedgerCaches() {
  "use strict";

  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const appBasePath = new URL(".", window.location.href).pathname;
      if (!appBasePath.startsWith("/apps/ledger/")) return;

      const registrations = await navigator.serviceWorker.getRegistrations();
      const appRegistrations = registrations.filter((registration) => {
        try {
          return new URL(registration.scope).pathname === appBasePath;
        } catch {
          return false;
        }
      });
      await Promise.all(appRegistrations.map((registration) => registration.unregister()));

      if (!("caches" in window)) return;
      const keys = await window.caches.keys();
      const scopedCachePrefix = `daily-ledger:${appBasePath}`;
      await Promise.all(
        keys
          .filter((key) => key.startsWith(scopedCachePrefix))
          .map((key) => window.caches.delete(key))
      );
    } catch {
      // Cache retirement is best effort and never broadens to another App's scope.
    }
  });
})();
