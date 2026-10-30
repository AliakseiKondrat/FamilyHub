// Photo blobs live in IndexedDB (localStorage is far too small); only metadata goes into app state.
const DB = 'familyhub-photos'
const STORE = 'blobs'

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db()
  return new Promise((resolve, reject) => {
    const req = fn(d.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const putBlob = (key: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, key))
export const getBlob = (key: string) => tx<Blob | undefined>('readonly', (s) => s.get(key))
export const deleteBlob = (key: string) => tx('readwrite', (s) => s.delete(key))

/** Downscale to `max` px on the long side and re-encode as JPEG. */
export async function compress(file: File, max: number, quality = 0.82) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', quality))
  return { blob, width: bmp.width, height: bmp.height }
}
