import "@testing-library/jest-dom/vitest";
// jsdom has no IndexedDB, which is where Projects live (decision-00011).
import "fake-indexeddb/auto";

// jsdom in this environment does not expose localStorage; provide a minimal
// in-memory implementation so persistence tests can exercise save/load.
if (typeof window !== "undefined" && !window.localStorage) {
  const store = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    },
  });
}
