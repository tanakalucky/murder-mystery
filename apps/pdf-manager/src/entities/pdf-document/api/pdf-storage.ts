import type { PdfDocument } from "../model/types";

const DB_NAME = "pdf-manager-db";
const DB_VERSION = 1;
const STORE_NAME = "pdfs";

const isPdfDocument = (value: unknown): value is PdfDocument => {
  if (typeof value !== "object" || value === null) return false;

  return (
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "addedAt" in value &&
    typeof value.addedAt === "number" &&
    "file" in value &&
    value.file instanceof File
  );
};

const toError = (cause: DOMException | null, message: string): Error => {
  return cause ?? new Error(message);
};

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(toError(request.error, "IndexedDB を開けませんでした"));
  });
};

/**
 * 保存済みの PDF を追加順（古い→新しい）で返す。
 */
export const loadAllPdfDocuments = async (): Promise<readonly PdfDocument[]> => {
  const db = await openDb();

  try {
    const records = await new Promise<readonly unknown[]>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(toError(request.error, "PDF の読み込みに失敗しました"));
    });

    return records.filter(isPdfDocument).sort((a, b) => a.addedAt - b.addedAt);
  } finally {
    db.close();
  }
};

export const deleteAllPdfDocuments = async (): Promise<void> => {
  const db = await openDb();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");

      transaction.objectStore(STORE_NAME).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(toError(transaction.error, "PDF の削除に失敗しました"));
    });
  } finally {
    db.close();
  }
};

export const savePdfDocument = async (pdf: PdfDocument): Promise<void> => {
  const db = await openDb();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");

      transaction.objectStore(STORE_NAME).put(pdf);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(toError(transaction.error, "PDF の保存に失敗しました"));
    });
  } finally {
    db.close();
  }
};
