import { supabase } from './supabase'

// Photo blobs live in IndexedDB (localStorage is far too small); only metadata goes into app state.
// When sync is on, IndexedDB is a cache in front of the private Supabase Storage bucket.
const DB = 'familyhub-photos'
const STORE = 'blobs'
const BUCKET = 'photos'
const PENDING_KEY = 'familyhub:photo-uploads'

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

const localPut = (key: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, key))
const localGet = (key: string) => tx<Blob | undefined>('readonly', (s) => s.get(key))
const localDelete = (key: string) => tx('readwrite', (s) => s.delete(key))

/** "<id>:full" → "<id>/full.jpg" in the bucket. */
const remotePath = (key: string) => key.replace(':', '/') + '.jpg'

const pending = (): string[] => { try { return JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') } catch { return [] } }
const setPending = (keys: string[]) => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(keys)) } catch { /* ignore */ } }

/** Save locally right away; the upload is queued so it survives being offline. */
export async function putBlob(key: string, blob: Blob) {
  await localPut(key, blob)
  if (supabase) { setPending([...new Set([...pending(), key])]); flushPhotoUploads().catch(() => {}) }
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  const local = await localGet(key)
  if (local || !supabase) return local
  const { data } = await supabase.storage.from(BUCKET).download(remotePath(key))
  if (data) await localPut(key, data)
  return data ?? undefined
}

export async function deleteBlob(key: string) {
  await localDelete(key)
  setPending(pending().filter((k) => k !== key))
  await supabase?.storage.from(BUCKET).remove([remotePath(key)])
}

let uploading = false
export async function flushPhotoUploads() {
  if (!supabase || uploading) return
  uploading = true
  try {
    for (const key of pending()) {
      const blob = await localGet(key)
      if (blob) {
        const { error } = await supabase.storage.from(BUCKET).upload(remotePath(key), blob, { upsert: true, contentType: 'image/jpeg' })
        if (error) throw error
      }
      setPending(pending().filter((k) => k !== key))
    }
  } finally {
    uploading = false
  }
}

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
