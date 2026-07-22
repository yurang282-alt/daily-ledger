(function cleanupDailyLedgerWorker(root) {
  "use strict";

  if (!("serviceWorker" in root.navigator)) return;
  root.addEventListener("load", async () => {
    try {
      const appBasePath = new URL(".", root.location.href).pathname;
      if (!appBasePath.startsWith("/apps/ledger/")) return;
      const registrations = await root.navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations
          .filter((registration) => new URL(registration.scope).pathname === appBasePath)
          .map((registration) => registration.unregister()),
      );
      if (!root.caches) return;
      const scopedCachePrefix = `daily-ledger:${appBasePath}`;
      const keys = await root.caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith(scopedCachePrefix)).map((key) => root.caches.delete(key)));
    } catch {
      // Cache cleanup failure must not widen scope or reveal previous HTML.
    }
  });
})(window);
