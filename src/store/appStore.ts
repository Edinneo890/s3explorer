import { createStore, unwrap } from 'solid-js/store';
import type { Connection, S3Bucket, S3Object, PreviewData } from '../../shared/types';

interface AppState {
  connections: Connection[];
  activeConnectionId: string | null;
  currentBucket: string | null;
  currentPath: string;
  buckets: S3Bucket[];
  objects: S3Object[];
  loadingBuckets: boolean;
  loadingObjects: boolean;
  error: string | null;
  showAddModal: boolean;
  editingConnection: Connection | null;
  notification: { type: 'success' | 'error'; message: string } | null;
  
  previewObject: S3Object | null;
  previewData: PreviewData | null;
  loadingPreview: boolean;
  
  renamingObject: S3Object | null;
  
  selectedKeys: string[];
  
  treeNodes: Record<string, string[]>;
  treeExpanded: string[];   
  treeLoading: string[];    
}

export const [state, setState] = createStore<AppState>({
  connections: [],
  activeConnectionId: null,
  currentBucket: null,
  currentPath: '',
  buckets: [],
  objects: [],
  loadingBuckets: false,
  loadingObjects: false,
  error: null,
  showAddModal: false,
  editingConnection: null,
  notification: null,
  previewObject: null,
  previewData: null,
  loadingPreview: false,
  renamingObject: null,
  selectedKeys: [],
  treeNodes: {},
  treeExpanded: [],
  treeLoading: [],
});

export const getActiveConnection = (): Connection | null => {
  const conn = state.connections.find(c => c.id === state.activeConnectionId);
  return conn ? unwrap(conn) : null;
};

let notifTimer: ReturnType<typeof setTimeout> | null = null;

function notify(type: 'success' | 'error', message: string): void {
  if (notifTimer) clearTimeout(notifTimer);
  setState({ notification: { type, message } });
  notifTimer = setTimeout(() => setState({ notification: null }), 3500);
}

export async function initConnections(): Promise<void> {
  const connections = await window.electron.store.getConnections();
  setState({ connections });
}

export async function saveConnection(conn: Connection): Promise<void> {
  await window.electron.store.saveConnection(conn);
  setState({ connections: await window.electron.store.getConnections() });
}

export async function removeConnection(id: string): Promise<void> {
  await window.electron.store.deleteConnection(id);
  const connections = await window.electron.store.getConnections();
  const wasActive = state.activeConnectionId === id;
  setState({
    connections,
    ...(wasActive ? {
      activeConnectionId: null, currentBucket: null, currentPath: '',
      buckets: [], objects: [], treeNodes: {}, treeExpanded: [], treeLoading: [],
    } : {}),
  });
}

export function openAddModal(conn?: Connection): void {
  setState({ showAddModal: true, editingConnection: conn ?? null });
}

export function closeAddModal(): void {
  setState({ showAddModal: false, editingConnection: null });
}

export async function selectConnection(id: string): Promise<void> {
  setState({
    activeConnectionId: id,
    currentBucket: null, currentPath: '', buckets: [], objects: [],
    loadingBuckets: true, error: null,
    treeNodes: {}, treeExpanded: [], treeLoading: [], selectedKeys: [],
  });
  const found = state.connections.find(c => c.id === id);
  if (!found) return;
  const conn = unwrap(found);
  const result = await window.electron.s3.listBuckets(conn);
  if (result.error) setState({ loadingBuckets: false, error: result.error });
  else setState({ loadingBuckets: false, buckets: result.data ?? [] });
}

export async function selectBucket(bucket: string): Promise<void> {
  setState({
    currentBucket: bucket, currentPath: '', objects: [],
    treeNodes: {}, treeExpanded: [], treeLoading: [], selectedKeys: [],
  });
  await navigateTo('');
}

export async function navigateTo(prefix: string): Promise<void> {
  const conn = getActiveConnection();
  const bucket = state.currentBucket;
  if (!conn || !bucket) return;

  setState({ currentPath: prefix, loadingObjects: true, error: null, selectedKeys: [] });
  const result = await window.electron.s3.listObjects(conn, bucket, prefix);
  if (result.error) {
    setState({ loadingObjects: false, error: result.error });
  } else {
    setState({ loadingObjects: false, objects: result.data ?? [] });

    
    
    
    const ancestors: string[] = [''];
    if (prefix) {
      const parts = prefix.split('/').filter(Boolean);
      for (let i = 0; i < parts.length - 1; i++) {
        ancestors.push(parts.slice(0, i + 1).join('/') + '/');
      }
      
      ancestors.push(prefix);
    }
    
    for (const p of ancestors) {
      _ensureTreeNodeLoaded(conn, bucket, p);
    }
    
    setState('treeExpanded', (prev) => {
      const set = new Set(prev);
      ancestors.forEach(a => set.add(a));
      return [...set];
    });
  }
}

export function goBackToBuckets(): void {
  setState({ currentBucket: null, currentPath: '', objects: [], selectedKeys: [] });
}

export async function goUp(): Promise<void> {
  const parts = state.currentPath.split('/').filter(Boolean);
  parts.pop();
  await navigateTo(parts.length > 0 ? parts.join('/') + '/' : '');
}

export async function refresh(): Promise<void> {
  if (state.currentBucket) {
    
    setState('treeNodes', state.currentPath, undefined as any);
    await navigateTo(state.currentPath);
  } else if (state.activeConnectionId) {
    await selectConnection(state.activeConnectionId);
  }
}

async function _ensureTreeNodeLoaded(conn: Connection, bucket: string, prefix: string): Promise<void> {
  if (state.treeNodes[prefix] !== undefined) return; 
  if (state.treeLoading.includes(prefix)) return;    

  setState('treeLoading', (prev) => [...prev, prefix]);
  try {
    const result = await window.electron.s3.listObjects(conn, bucket, prefix);
    if (result.data) {
      const folders = result.data.filter(o => o.isFolder).map(o => String(o.key));
      setState('treeNodes', prefix, folders);
    }
  } catch {  }
  setState('treeLoading', (prev) => prev.filter(p => p !== prefix));
}

export function toggleTreeNode(prefix: string): void {
  const isExpanded = state.treeExpanded.includes(prefix);
  if (isExpanded) {
    setState('treeExpanded', (prev) => prev.filter(p => p !== prefix));
  } else {
    setState('treeExpanded', (prev) => [...prev, prefix]);
    const conn = getActiveConnection();
    const bucket = state.currentBucket;
    if (conn && bucket) _ensureTreeNodeLoaded(conn, bucket, prefix);
  }
}

export function loadTreeNode(prefix: string): void {
  const conn = getActiveConnection();
  const bucket = state.currentBucket;
  if (conn && bucket) _ensureTreeNodeLoaded(conn, bucket, prefix);
}

export async function uploadFiles(): Promise<void> {
  const conn = getActiveConnection();
  const bucket = state.currentBucket;
  if (!conn || !bucket) return;

  const result = await window.electron.s3.uploadFiles(conn, bucket, state.currentPath);
  if (result.error) notify('error', `Upload failed: ${result.error}`);
  else if (result.data != null) {
    notify('success', `Uploaded ${result.data} file(s) successfully`);
    setState('treeNodes', state.currentPath, undefined as any); 
    await navigateTo(state.currentPath);
  }
}

export async function downloadFile(key: string): Promise<void> {
  const conn = getActiveConnection();
  const bucket = state.currentBucket;
  if (!conn || !bucket) return;

  const result = await window.electron.s3.downloadFile(conn, bucket, key);
  if (result.error) notify('error', `Download failed: ${result.error}`);
  else if (result.data) notify('success', 'File downloaded successfully');
}

export async function downloadSelected(): Promise<void> {
  const conn = getActiveConnection();
  const bucket = state.currentBucket;
  if (!conn || !bucket || state.selectedKeys.length === 0) return;

  const keys = [...state.selectedKeys];
  const result = await window.electron.s3.downloadFiles(conn, bucket, keys);
  if (result.error) notify('error', `Download failed: ${result.error}`);
  else if (result.data != null) {
    notify('success', `Downloaded ${result.data} file(s) successfully`);
    setState({ selectedKeys: [] });
  }
}

export async function deleteObject(key: string): Promise<void> {
  const conn = getActiveConnection();
  const bucket = state.currentBucket;
  if (!conn || !bucket) return;

  const result = await window.electron.s3.deleteObject(conn, bucket, key);
  if (result.error) notify('error', `Delete failed: ${result.error}`);
  else {
    notify('success', 'Deleted successfully');
    setState({ selectedKeys: state.selectedKeys.filter(k => k !== key) });
    await navigateTo(state.currentPath);
  }
}

export async function deleteSelected(): Promise<void> {
  const conn = getActiveConnection();
  const bucket = state.currentBucket;
  if (!conn || !bucket || state.selectedKeys.length === 0) return;

  for (const key of [...state.selectedKeys]) {
    await window.electron.s3.deleteObject(conn, bucket, key);
  }
  notify('success', `Deleted ${state.selectedKeys.length} item(s)`);
  setState({ selectedKeys: [] });
  await navigateTo(state.currentPath);
}

export async function createFolder(name: string): Promise<void> {
  const conn = getActiveConnection();
  const bucket = state.currentBucket;
  if (!conn || !bucket || !name.trim()) return;

  const key = state.currentPath + name.trim().replace(/\/+$/, '') + '/';
  const result = await window.electron.s3.createFolder(conn, bucket, key);
  if (result.error) notify('error', `Failed to create folder: ${result.error}`);
  else {
    notify('success', `Folder "${name}" created`);
    setState('treeNodes', state.currentPath, undefined as any); 
    await navigateTo(state.currentPath);
  }
}

export function toggleSelect(key: string): void {
  const sel = state.selectedKeys;
  if (sel.includes(key)) setState({ selectedKeys: sel.filter(k => k !== key) });
  else setState({ selectedKeys: [...sel, key] });
}

export function selectRange(fromKey: string, toKey: string): void {
  const keys = state.objects.map(o => o.key);
  const a = keys.indexOf(fromKey);
  const b = keys.indexOf(toKey);
  if (a < 0 || b < 0) return;
  const [lo, hi] = a < b ? [a, b] : [b, a];
  const range = keys.slice(lo, hi + 1);
  const merged = [...new Set([...state.selectedKeys, ...range])];
  setState({ selectedKeys: merged });
}

export function selectAll(): void {
  setState({ selectedKeys: state.objects.map(o => o.key) });
}

export function clearSelection(): void {
  setState({ selectedKeys: [] });
}

export function openPreview(obj: S3Object): void {
  setState({ previewObject: obj, previewData: null, loadingPreview: true });
  _loadPreview(obj);
}

export function closePreview(): void {
  setState({ previewObject: null, previewData: null, loadingPreview: false });
}

export async function savePreviewContent(content: string): Promise<void> {
  const conn = getActiveConnection();
  const bucket = state.currentBucket;
  const obj = state.previewObject;
  if (!conn || !bucket || !obj) return;
  const contentType = state.previewData?.contentType || 'text/plain';
  const result = await window.electron.s3.putObjectContent(conn, bucket, String(obj.key), content, contentType);
  if (result.error) {
    notify('error', `Save failed: ${result.error}`);
    throw new Error(result.error);
  }
  setState('previewData', 'content', content);
  notify('success', 'File saved');
}

async function _loadPreview(obj: S3Object): Promise<void> {
  try {
    const conn = getActiveConnection();
    const bucket = state.currentBucket;
    if (!conn || !bucket) {
      setState({ loadingPreview: false, previewData: { content: '', contentType: '', size: 0, kind: 'none' } });
      return;
    }
    const key = String(obj.key);
    const result = await window.electron.s3.getObjectPreview(conn, bucket, key);
    if (result.error) setState({ loadingPreview: false, previewData: { content: '', contentType: result.error, size: 0, kind: 'none' } });
    else setState({ loadingPreview: false, previewData: result.data ?? null });
  } catch (e: any) {
    setState({ loadingPreview: false, previewData: { content: '', contentType: e?.message ?? 'Error', size: 0, kind: 'none' } });
  }
}

export function openRename(obj: S3Object): void {
  setState({ renamingObject: obj });
}

export function closeRename(): void {
  setState({ renamingObject: null });
}

export async function renameObject(obj: S3Object, newKey: string): Promise<void> {
  const conn = getActiveConnection();
  const bucket = state.currentBucket;
  if (!conn || !bucket) return;

  const trimmedNew = newKey.trim();
  if (!trimmedNew || trimmedNew === obj.key) { closeRename(); return; }

  const result = await window.electron.s3.renameObject(conn, bucket, obj.key, trimmedNew);
  if (result.error) notify('error', `Move failed: ${result.error}`);
  else {
    notify('success', 'Moved successfully');
    closeRename();
    if (state.previewObject?.key === obj.key) closePreview();
    setState('treeNodes', state.currentPath, undefined as any);
    await navigateTo(state.currentPath);
  }
}
