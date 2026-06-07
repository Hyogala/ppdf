import localforage from 'localforage';
import type { StoredDocument, StoredAnnotations, RecentDoc } from '../types/storage';
import type { Stroke } from '../types/annotation';

const docStore = localforage.createInstance({ name: 'ppdf', storeName: 'docs' });
const annotStore = localforage.createInstance({ name: 'ppdf', storeName: 'annotations' });
const metaStore = localforage.createInstance({ name: 'ppdf', storeName: 'meta' });

export async function saveDocument(doc: StoredDocument): Promise<void> {
  await docStore.setItem(`doc:${doc.hash}`, doc);
  await updateRecentDocs(doc.hash, doc.fileName);
}

export async function loadDocument(hash: string): Promise<StoredDocument | null> {
  return docStore.getItem<StoredDocument>(`doc:${hash}`);
}

export async function saveAnnotations(hash: string, strokes: Stroke[], version: number): Promise<void> {
  const data: StoredAnnotations = {
    hash,
    strokes,
    version,
    lastModified: Date.now(),
  };
  await annotStore.setItem(`annotations:${hash}`, data);
}

export async function loadAnnotations(hash: string): Promise<StoredAnnotations | null> {
  return annotStore.getItem<StoredAnnotations>(`annotations:${hash}`);
}

export async function clearAnnotations(hash: string): Promise<void> {
  await annotStore.removeItem(`annotations:${hash}`);
}

export async function getRecentDocs(): Promise<RecentDoc[]> {
  return (await metaStore.getItem<RecentDoc[]>('recentDocs')) ?? [];
}

async function updateRecentDocs(hash: string, fileName: string): Promise<void> {
  const current = await getRecentDocs();
  const filtered = current.filter(d => d.hash !== hash);
  const updated: RecentDoc[] = [
    { hash, fileName, lastOpened: Date.now() },
    ...filtered,
  ].slice(0, 10);
  await metaStore.setItem('recentDocs', updated);
}
