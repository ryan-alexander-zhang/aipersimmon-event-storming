// The one IndexedDB object store that holds Projects (decision-00011), wrapped in
// promises. Reads hand back `unknown`: a stored record is untrusted like any other
// persisted data, so validation belongs to projects.ts, not here.
//
// Writes reject rather than swallow — a Project that did not save is something the
// Modeler has to be told about (us-00032-FR-5), unlike the old best-effort autosave.

const DB_NAME = "event-storming";
const DB_VERSION = 1;
const STORE = "projects";

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is unavailable."));
  }
  const open = indexedDB.open(DB_NAME, DB_VERSION);
  open.onupgradeneeded = () => {
    open.result.createObjectStore(STORE, { keyPath: "id" });
  };
  return promisify(open);
}

// One connection per call: the store is touched a few times a minute at most, and
// a short-lived connection cannot go stale behind a version change.
async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  try {
    return await promisify(run(db.transaction(STORE, mode).objectStore(STORE)));
  } finally {
    db.close();
  }
}

export function getAllRecords(): Promise<unknown[]> {
  return withStore("readonly", (s) => s.getAll());
}

export function getRecord(id: string): Promise<unknown> {
  return withStore("readonly", (s) => s.get(id));
}

export function putRecord(record: { id: string }): Promise<IDBValidKey> {
  return withStore("readwrite", (s) => s.put(record));
}

export function deleteRecord(id: string): Promise<undefined> {
  return withStore("readwrite", (s) => s.delete(id));
}
