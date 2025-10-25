
import type { MatchState } from '../types';

const DB_NAME = 'AI_Match_DB';
const DB_VERSION = 2; // Incremented DB version
const STATE_STORE = 'matchState';
const VIDEO_STORE = 'videos';
const CONFIG_STORE = 'appConfig';
const SYNC_QUEUE_STORE = 'syncQueue';
const ENCRYPTION_KEY_NAME = 'encryptionKey';

let dbPromise: Promise<IDBDatabase> | null = null;

// 1. Initialize DB
function initDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error("Error opening IndexedDB."));

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STATE_STORE)) {
        dbInstance.createObjectStore(STATE_STORE, { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains(VIDEO_STORE)) {
        dbInstance.createObjectStore(VIDEO_STORE, { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains(CONFIG_STORE)) {
        dbInstance.createObjectStore(CONFIG_STORE, { keyPath: 'key' });
      }
      if (!dbInstance.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        dbInstance.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
}

// 2. Crypto functions
async function getEncryptionKey(): Promise<CryptoKey> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CONFIG_STORE, 'readwrite');
    const store = transaction.objectStore(CONFIG_STORE);
    const request = store.get(ENCRYPTION_KEY_NAME);

    transaction.oncomplete = async () => {
        if (request.result) {
            resolve(request.result.value);
        } else {
            const newKey = await window.crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );
            // Re-open transaction to write the new key
            const writeTransaction = db.transaction(CONFIG_STORE, 'readwrite');
            const writeStore = writeTransaction.objectStore(CONFIG_STORE);
            writeStore.put({ key: ENCRYPTION_KEY_NAME, value: newKey });
            resolve(newKey);
        }
    };
    transaction.onerror = () => reject(new Error('Could not retrieve encryption key.'));
  });
}

async function encryptBuffer(data: BufferSource, key: CryptoKey): Promise<ArrayBuffer> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedContent = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
    );
    const fullBuffer = new Uint8Array(iv.length + encryptedContent.byteLength);
    fullBuffer.set(iv);
    fullBuffer.set(new Uint8Array(encryptedContent), iv.length);
    return fullBuffer.buffer;
}

async function encryptString(data: string, key: CryptoKey): Promise<ArrayBuffer> {
    const encodedData = new TextEncoder().encode(data);
    return encryptBuffer(encodedData, key);
}

async function decryptBuffer(encryptedData: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
    const iv = encryptedData.slice(0, 12);
    const data = encryptedData.slice(12);
    return await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        data
    );
}

async function decryptToString(encryptedData: ArrayBuffer, key: CryptoKey): Promise<string> {
    const decryptedContent = await decryptBuffer(encryptedData, key);
    return new TextDecoder().decode(decryptedContent);
}


// 3. Exported service functions
export async function saveEncryptedState(state: MatchState): Promise<void> {
    const db = await initDB();
    const key = await getEncryptionKey();
    const stateString = JSON.stringify(state);
    const encryptedState = await encryptString(stateString, key);
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STATE_STORE, 'readwrite');
        const store = transaction.objectStore(STATE_STORE);
        store.put({ id: 'currentMatch', data: encryptedState });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error('Failed to save state.'));
    });
}

export async function loadDecryptedState(): Promise<MatchState | null> {
    const db = await initDB();
    const key = await getEncryptionKey();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STATE_STORE, 'readonly');
        const store = transaction.objectStore(STATE_STORE);
        const request = store.get('currentMatch');

        request.onsuccess = async () => {
            if (request.result && request.result.data) {
                try {
                    const decryptedString = await decryptToString(request.result.data, key);
                    resolve(JSON.parse(decryptedString));
                } catch (e) {
                    console.error("Decryption failed:", e, "Database might be corrupt or key changed. Clearing data.");
                    await clearDB();
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(new Error('Failed to load state.'));
    });
}

export async function saveVideoBlob(videoBlob: Blob, matchName: string): Promise<void> {
    const db = await initDB();
    const key = await getEncryptionKey();
    
    const buffer = await videoBlob.arrayBuffer();
    const encryptedData = await encryptBuffer(buffer, key);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(VIDEO_STORE, 'readwrite');
        const store = transaction.objectStore(VIDEO_STORE);
        const videoId = `video-${Date.now()}`;
        const videoRecord = {
            id: videoId,
            name: `${matchName}-Recording-${new Date().toLocaleString()}`,
            encryptedData: encryptedData
        };
        store.add(videoRecord);
        transaction.oncomplete = async () => {
            console.log(`Encrypted video saved locally: ${videoRecord.name}`);
            await addToSyncQueue({ type: 'video', localId: videoId, name: videoRecord.name });
            resolve();
        };
        transaction.onerror = () => reject(new Error('Failed to save video.'));
    });
}

export async function saveHighlightBlob(highlightBlob: Blob): Promise<string> {
    const db = await initDB();
    const key = await getEncryptionKey();
    const buffer = await highlightBlob.arrayBuffer();
    const encryptedData = await encryptBuffer(buffer, key);
    const highlightId = `highlight-${Date.now()}-${Math.random()}`;

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(VIDEO_STORE, 'readwrite');
        const store = transaction.objectStore(VIDEO_STORE);
        const record = {
            id: highlightId,
            encryptedData: encryptedData,
            name: `Highlight Blob ${highlightId}`
        };
        store.add(record);
        transaction.oncomplete = () => resolve(highlightId);
        transaction.onerror = () => reject(new Error('Failed to save highlight blob.'));
    });
}

export async function getDecryptedBlobById(id: string): Promise<Blob | null> {
    const encryptedRecord = await getEncryptedVideoById(id);
    if (!encryptedRecord || !encryptedRecord.encryptedData) return null;

    const key = await getEncryptionKey();
    const decryptedBuffer = await decryptBuffer(encryptedRecord.encryptedData, key);

    const hevcMimeType = 'video/mp4; codecs="hvc1"';
    const isHevcSupported = window.MediaRecorder && MediaRecorder.isTypeSupported(hevcMimeType);
    const mimeType = isHevcSupported ? hevcMimeType : 'video/webm';
    
    return new Blob([decryptedBuffer], { type: mimeType });
}


export async function clearDB(): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const stores = [STATE_STORE, VIDEO_STORE, CONFIG_STORE, SYNC_QUEUE_STORE];
        const transaction = db.transaction(stores, 'readwrite');
        stores.forEach(storeName => transaction.objectStore(storeName).clear());
        transaction.oncomplete = () => {
          console.log("Database cleared.");
          resolve()
        };
        transaction.onerror = () => reject(new Error('Failed to clear database.'));
    });
}

export async function getSavedVideosList(): Promise<{ id: string; name: string }[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(VIDEO_STORE, 'readonly');
        const store = transaction.objectStore(VIDEO_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
            if (request.result) {
                // Filter out highlight blobs, which don't have a 'name' property
                const videoList = request.result
                    .filter((record: any) => record.name) 
                    .map((record: any) => ({
                        id: record.id,
                        name: record.name,
                    }));
                resolve(videoList);
            } else {
                resolve([]);
            }
        };
        request.onerror = () => reject(new Error('Failed to retrieve video list.'));
    });
}

export async function deleteVideo(id: string): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(VIDEO_STORE, 'readwrite');
        const store = transaction.objectStore(VIDEO_STORE);
        store.delete(id);
        transaction.oncomplete = () => {
          resolve();
        };
        transaction.onerror = () => reject(new Error('Failed to delete video.'));
    });
}

// 4. Sync Queue Management
interface SyncQueueItem {
  id: string;
  type: 'video';
  localId: string;
  name: string;
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);
    const fullItem: SyncQueueItem = { ...item, id: `sync-${Date.now()}-${Math.random()}` };
    store.add(fullItem);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Failed to add item to sync queue.'));
  });
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_QUEUE_STORE, 'readonly');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to retrieve sync queue.'));
  });
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);
    store.delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Failed to remove item from sync queue.'));
  });
}

export async function getEncryptedVideoById(id: string): Promise<{ id: string; name: string; encryptedData: ArrayBuffer } | null> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(VIDEO_STORE, 'readonly');
        const store = transaction.objectStore(VIDEO_STORE);
        const request = store.get(id);

        request.onsuccess = () => {
            resolve(request.result || null);
        };
        request.onerror = () => reject(new Error('Failed to load video by ID.'));
    });
}
