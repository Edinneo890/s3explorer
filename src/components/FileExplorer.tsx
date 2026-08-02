import { For, Show, createSignal, createMemo, onMount, onCleanup, createEffect } from 'solid-js';
import {
  state, navigateTo, goBackToBuckets, uploadFiles, downloadFile, downloadSelected,
  deleteObject, deleteSelected, createFolder, refresh,
  openPreview, closePreview, openRename, closeRename, renameObject,
  toggleSelect, selectRange, selectAll, clearSelection, savePreviewContent,
} from '../store/appStore';
import { MonacoEditor, langFromExt } from './MonacoEditor';
import type { S3Object } from '../../shared/types';

function formatSize(bytes?: number): string {
  if (bytes === undefined) return '—';
  if (bytes === 0) return '0 B';
  const u = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(bytes)/Math.log(1024));
  return `${(bytes/Math.pow(1024,i)).toFixed(i===0?0:1)} ${u[i]}`;
}
function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}

const MIME_MAP: Record<string,string> = {
  jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',
  webp:'image/webp',svg:'image/svg+xml',ico:'image/x-icon',avif:'image/avif',
  bmp:'image/bmp',tiff:'image/tiff',tif:'image/tiff',
  mp4:'video/mp4',mkv:'video/x-matroska',mov:'video/quicktime',
  avi:'video/x-msvideo',webm:'video/webm',wmv:'video/x-ms-wmv',
  mp3:'audio/mpeg',wav:'audio/wav',flac:'audio/flac',aac:'audio/aac',ogg:'audio/ogg',m4a:'audio/mp4',
  pdf:'application/pdf',doc:'application/msword',
  docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:'application/vnd.ms-excel',
  xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt:'text/plain',md:'text/markdown',csv:'text/csv',
  html:'text/html',htm:'text/html',css:'text/css',
  js:'text/javascript',ts:'text/typescript',tsx:'text/tsx',jsx:'text/jsx',
  json:'application/json',xml:'application/xml',
  yaml:'application/yaml',yml:'application/yaml',
  toml:'application/toml',sh:'text/x-sh',py:'text/x-python',
  go:'text/x-go',rs:'text/x-rust',cpp:'text/x-c++',c:'text/x-c',
  java:'text/x-java',rb:'text/x-ruby',php:'text/x-php',
  sql:'application/sql',log:'text/plain',env:'text/plain',
  zip:'application/zip',tar:'application/x-tar',gz:'application/gzip',
  bz2:'application/x-bzip2','7z':'application/x-7z-compressed',rar:'application/vnd.rar',
  ttf:'font/ttf',otf:'font/otf',woff:'font/woff',woff2:'font/woff2',
  wasm:'application/wasm',bin:'application/octet-stream',exe:'application/octet-stream',
};
function mimeOf(ext: string): string { return MIME_MAP[ext.toLowerCase()] ?? ''; }

function Breadcrumbs() {
  const parts = () => state.currentPath.split('/').filter(Boolean);
  return (
    <nav class="breadcrumb">
      <button class="crumb" onClick={() => navigateTo('')}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <ellipse cx="12" cy="5" rx="9" ry="3"/>
          <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
          <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
        </svg>
        {state.currentBucket}
      </button>
      <For each={parts()}>
        {(part, i) => {
          const prefix = () => parts().slice(0,i()+1).join('/')+'/';
          return (<><span class="crumb-sep">/</span><button class="crumb" onClick={() => navigateTo(prefix())}>{part}</button></>);
        }}
      </For>
    </nav>
  );
}

function NewFolderModal(props: { onClose: () => void }) {
  const [name, setName] = createSignal('');
  const [creating, setCreating] = createSignal(false);
  async function handleSubmit(e: Event) {
    e.preventDefault();
    const n = name().trim();
    if (!n || creating()) return;
    setCreating(true);
    await createFolder(n);
    setCreating(false);
    props.onClose();
  }
  return (
    <div class="modal-overlay" onClick={(e) => { if (e.target===e.currentTarget) props.onClose(); }}>
      <div class="modal" style="width:400px">
        <div class="modal-header">
          <h2>New Folder</h2>
          <button class="modal-close" onClick={props.onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form class="modal-body" onSubmit={handleSubmit} style="gap:16px">
          <div class="form-group">
            <label class="form-label">Folder name</label>
            <input class="form-input" type="text" placeholder="e.g. my-folder or images/photos"
              value={name()} onInput={(e) => setName(e.currentTarget.value)} autofocus autocomplete="off"/>
          </div>
          <p style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5">
            Nested paths supported: <code style="font-family:monospace;background:var(--md-surface-c-highest);padding:1px 5px;border-radius:4px;color:var(--md-primary)">images/2026</code>
          </p>
          <div class="modal-footer">
            <button type="button" class="btn-secondary btn-sm" onClick={props.onClose}>Cancel</button>
            <button type="submit" class="btn-primary btn-sm" disabled={creating()||!name().trim()}>
              {creating() ? 'Creating…' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RenameDialog() {
  const obj = () => state.renamingObject!;
  const [newKey, setNewKey] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const initialKey = createMemo(() => {
    const o = state.renamingObject;
    if (o) setNewKey(o.key);
    return o?.key ?? '';
  });
  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (saving()) return;
    setSaving(true);
    await renameObject(obj(), newKey());
    setSaving(false);
  }
  return (
    <div class="modal-overlay" onClick={(e) => { if (e.target===e.currentTarget) closeRename(); }}>
      <div class="modal rename-modal">
        <div class="modal-header">
          <h2>Move / Rename</h2>
          <button class="modal-close" onClick={closeRename}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form class="modal-body rename-body" onSubmit={handleSubmit}>
          <p class="rename-hint">Edit the full key. Change the name to rename, change the path prefix to move. Folder keys must end with <code>/</code>.</p>
          <div class="form-group">
            <label class="form-label">Key path</label>
            <input class="form-input rename-input" type="text" value={newKey()}
              onInput={(e) => setNewKey(e.currentTarget.value)} spellcheck={false} autofocus/>
          </div>
          <Show when={newKey() !== initialKey() && newKey().trim()}>
            <div class="rename-diff">
              <span class="rename-diff-old">{initialKey()}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>
              <span class="rename-diff-new">{newKey().trim()}</span>
            </div>
          </Show>
          <div class="modal-footer">
            <button type="button" class="btn-secondary btn-sm" onClick={closeRename}>Cancel</button>
            <button type="submit" class="btn-primary btn-sm"
              disabled={saving()||!newKey().trim()||newKey().trim()===initialKey()}>
              {saving() ? 'Moving…' : 'Move'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PreviewPanel() {
  const obj = () => state.previewObject!;
  const data = () => state.previewData;
  const ext = () => obj().name.split('.').pop()?.toLowerCase() ?? '';
  const isText = () => data()?.kind === 'text';

  const [expanded, setExpanded] = createSignal(false);
  const [editing, setEditing] = createSignal(false);
  const [editContent, setEditContent] = createSignal('');
  const [dirty, setDirty] = createSignal(false);
  const [saving, setSaving] = createSignal(false);

  createEffect(() => {
    if (data()?.kind === 'text') setEditContent(data()!.content);
  });

  function enterEdit() {
    setEditContent(data()!.content);
    setDirty(false);
    setEditing(true);
  }

  function exitEdit() {
    if (dirty() && !window.confirm('Discard unsaved changes?')) return;
    setEditing(false);
    setDirty(false);
  }

  async function handleSave() {
    if (!dirty() || saving()) return;
    setSaving(true);
    try {
      await savePreviewContent(editContent());
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
    if (e.key === 'Escape') {
      if (editing()) { exitEdit(); }
      else if (expanded()) { setExpanded(false); }
      else { closePreview(); }
    }
  }

  onMount(() => window.addEventListener('keydown', handleKeyDown));
  onCleanup(() => window.removeEventListener('keydown', handleKeyDown));

  const header = () => (
    <div class="preview-header">
      <div class="preview-title-row">
        <Show when={obj().isFolder} fallback={<FileIcon ext={ext()} size={20}/>}>
          <FolderIcon size={20}/>
        </Show>
        <span class="preview-name" title={obj().name}>{obj().name}</span>
        <div class="preview-header-btns">
          <button class="icon-btn" title={expanded() ? 'Collapse (Esc)' : 'Expand'} onClick={() => setExpanded(v => !v)}>
            <Show when={expanded()} fallback={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            }>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>
            </Show>
          </button>
          <button class="modal-close" title="Close (Esc)" onClick={() => { if (editing() && dirty()) { if (!window.confirm('Discard unsaved changes?')) return; } closePreview(); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div class="preview-meta">
        <Show when={!obj().isFolder}><span>{formatSize(obj().size)}</span><span>·</span></Show>
        <span class="preview-key" title={obj().key}>{obj().key}</span>
      </div>
      <Show when={data() && data()!.contentType && data()!.kind !== 'none'}>
        <div class="preview-mime">{data()!.contentType}</div>
      </Show>
    </div>
  );

  const content = () => (
    <div class="preview-content">
      <Show when={state.loadingPreview}>
        <div class="loading-area"><div class="spinner"/><p>Loading preview…</p></div>
      </Show>
      <Show when={!state.loadingPreview && data()}>
        <Show when={data()!.kind === 'image'}>
          <div class="preview-img-wrap">
            <img src={`data:${data()!.contentType};base64,${data()!.content}`} alt={obj().name} class="preview-img"/>
          </div>
        </Show>
        <Show when={data()!.kind === 'text'}>
          <div class="preview-monaco-wrap">
            <MonacoEditor
              value={editing() ? editContent() : data()!.content}
              language={langFromExt(ext())}
              readOnly={!editing()}
              onValueChange={v => { setEditContent(v); setDirty(true); }}
              onSave={handleSave}
            />
          </div>
        </Show>
        <Show when={data()!.kind === 'none'}>
          <div class="preview-no-preview">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.4">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p>No preview available</p>
            <p class="preview-no-hint">{formatSize(data()!.size)} · {data()!.contentType||'unknown type'}</p>
          </div>
        </Show>
      </Show>
    </div>
  );

  const actions = () => (
    <div class="preview-actions">
      <Show when={isText() && !editing()}>
        <button class="btn-secondary btn-sm" onClick={enterEdit}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
      </Show>
      <Show when={editing()}>
        <button class="btn-primary btn-sm" onClick={handleSave} disabled={!dirty() || saving()} title="Save (Ctrl+S)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          {saving() ? 'Saving…' : dirty() ? 'Save*' : 'Saved'}
        </button>
        <button class="btn-secondary btn-sm" onClick={exitEdit}>Cancel</button>
      </Show>
      <button class="btn-secondary btn-sm" onClick={() => openRename(obj())}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Move
      </button>
      <Show when={!obj().isFolder}>
        <button class="btn-secondary btn-sm" onClick={() => downloadFile(obj().key)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>
          Download
        </button>
      </Show>
      <Show when={isText()}>
        <div class="preview-shortcuts">
          <Show when={editing()}>
            <span><kbd>Ctrl+S</kbd> Save</span>
            <span><kbd>Ctrl+Z</kbd> Undo</span>
          </Show>
          <span><kbd>Esc</kbd> {editing() ? 'Cancel edit' : expanded() ? 'Collapse' : 'Close'}</span>
        </div>
      </Show>
    </div>
  );

  return (
    <Show when={expanded()} fallback={
      <aside class="preview-panel">
        {header()}
        {content()}
        {actions()}
      </aside>
    }>
      <div class="preview-modal-overlay" onClick={e => { if (e.target === e.currentTarget) { if (editing() && dirty()) { if (!window.confirm('Discard unsaved changes?')) return; } setExpanded(false); } }}>
        <div class="preview-modal-box">
          {header()}
          {content()}
          {actions()}
        </div>
      </div>
    </Show>
  );
}

export default function FileExplorer() {
  const [showFolderModal, setShowFolderModal] = createSignal(false);
  let lastSelectedKey: string | null = null;

  const selCount = () => state.selectedKeys.length;
  const selFiles = () => state.selectedKeys.filter(k => !k.endsWith('/'));

  
  function onKeyDown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.key === 'Escape') { clearSelection(); closePreview(); }
    if ((e.ctrlKey||e.metaKey) && e.key === 'a') { e.preventDefault(); selectAll(); }
    if ((e.ctrlKey||e.metaKey) && e.key === 'u') { e.preventDefault(); uploadFiles(); }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selCount() > 0) {
        e.preventDefault();
        if (window.confirm(`Delete ${selCount()} item(s)? This cannot be undone.`)) deleteSelected();
      }
    }
    if ((e.ctrlKey||e.metaKey) && e.key === 'd') {
      e.preventDefault();
      if (selFiles().length > 0) downloadSelected();
    }
    if ((e.ctrlKey||e.metaKey) && e.key === 'r') { e.preventDefault(); refresh(); }
  }

  onMount(() => window.addEventListener('keydown', onKeyDown));
  onCleanup(() => window.removeEventListener('keydown', onKeyDown));

  
  function handleRowClick(e: MouseEvent, obj: S3Object) {
    if ((e.target as HTMLElement).closest('.row-actions, input[type=checkbox]')) return;
    if (obj.isFolder) { navigateTo(obj.key); return; }

    if (e.shiftKey && lastSelectedKey) {
      selectRange(lastSelectedKey, obj.key);
    } else if (e.ctrlKey || e.metaKey) {
      toggleSelect(obj.key);
      lastSelectedKey = obj.key;
    } else {
      
      openPreview(obj);
    }
  }

  function handleCheckbox(e: MouseEvent, obj: S3Object) {
    e.stopPropagation();
    if (e.shiftKey && lastSelectedKey) {
      selectRange(lastSelectedKey, obj.key);
    } else {
      toggleSelect(obj.key);
      lastSelectedKey = obj.key;
    }
  }

  function handleDelete(obj: S3Object) {
    const label = obj.isFolder ? `folder "${obj.name}" and all its contents` : `"${obj.name}"`;
    if (window.confirm(`Delete ${label}? This cannot be undone.`)) deleteObject(obj.key);
  }

  return (
    <div class="file-explorer">
      <Show when={state.renamingObject}><RenameDialog/></Show>
      <Show when={showFolderModal()}><NewFolderModal onClose={() => setShowFolderModal(false)}/></Show>

      
      <div class="explorer-toolbar">
        <Breadcrumbs/>
        <div class="toolbar-actions">
          
          <Show when={selCount() > 0}>
            <span class="sel-count">{selCount()} selected</span>
            <Show when={selFiles().length > 0}>
              <button class="btn-primary" onClick={downloadSelected}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>
                Download {selFiles().length}
              </button>
            </Show>
            <button class="btn-danger" onClick={() => {
              if (window.confirm(`Delete ${selCount()} item(s)? This cannot be undone.`)) deleteSelected();
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              Delete {selCount()}
            </button>
            <button class="btn-secondary" onClick={clearSelection}>Clear</button>
          </Show>

          
          <Show when={selCount() === 0}>
            <button class="btn-secondary" onClick={() => setShowFolderModal(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
              New Folder
            </button>
            <button class="btn-primary" onClick={uploadFiles} title="Upload (Ctrl+U)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
              Upload
            </button>
            <button class="btn-secondary" onClick={refresh}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Refresh
            </button>
          </Show>
        </div>
      </div>

      
      <div class={`explorer-body${state.previewObject ? ' has-preview' : ''}`}>
        <div class="file-main">
          <Show when={state.loadingObjects}>
            <div class="loading-area"><div class="spinner"/><p>Loading…</p></div>
          </Show>
          <Show when={!state.loadingObjects && state.error !== null}>
            <div class="error-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {state.error}
            </div>
          </Show>
          <Show when={!state.loadingObjects && state.error === null}>
            <Show when={state.objects.length > 0} fallback={
              <div class="empty-view">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.3"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                <p>This folder is empty.</p>
              </div>
            }>
              <div class="file-table-wrap" onClick={(e) => {
                if ((e.target as HTMLElement).closest('tr, th')) return;
                clearSelection();
              }}>
                <table class="file-table">
                  <thead>
                    <tr>
                      
                      <th class="col-check">
                        <input type="checkbox"
                          checked={selCount() === state.objects.length && state.objects.length > 0}
                          ref={(el) => { el.indeterminate = selCount() > 0 && selCount() < state.objects.length; }}
                          onChange={(e) => { e.stopPropagation(); selCount() === state.objects.length ? clearSelection() : selectAll(); }}
                        />
                      </th>
                      <th class="col-name">Name</th>
                      <th class="col-type">Type</th>
                      <th class="col-size">Size</th>
                      <th class="col-date">Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={state.objects}>
                      {(obj) => {
                        const isSelected = () => state.selectedKeys.includes(obj.key);
                        const isPreviewed = () => state.previewObject?.key === obj.key;
                        const ext = obj.name.split('.').pop() ?? '';
                        const mime = mimeOf(ext);
                        return (
                          <tr
                            class={`file-row${obj.isFolder?' folder-row':''}${isSelected()?' row-selected':''}${isPreviewed()?' row-previewed':''}`}
                            onClick={(e) => handleRowClick(e, obj)}
                          >
                            <td class="col-check" onClick={(e) => handleCheckbox(e, obj)}>
                              <input type="checkbox" checked={isSelected()} onClick={(e) => e.stopPropagation()}/>
                            </td>
                            <td class="col-name">
                              <div class="file-name-cell">
                                <Show when={obj.isFolder} fallback={<FileIcon ext={ext}/>}><FolderIcon/></Show>
                                <span>{obj.name}</span>
                              </div>
                            </td>
                            <td class="col-type">
                              {obj.isFolder
                                ? <span class="mime-badge mime-folder">folder</span>
                                : mime
                                  ? <span class="mime-badge" title={mime}>{mime}</span>
                                  : <span class="col-muted">—</span>
                              }
                            </td>
                            <td class="col-size">{obj.isFolder ? '—' : formatSize(obj.size)}</td>
                            <td class="col-date">
                              {formatDate(obj.lastModified)}
                              
                              <div class="row-actions">
                                <button class="action-btn" title="Rename / Move" onClick={(e) => { e.stopPropagation(); openRename(obj); }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <Show when={!obj.isFolder}>
                                  <button class="action-btn" title="Download" onClick={(e) => { e.stopPropagation(); downloadFile(obj.key); }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>
                                  </button>
                                </Show>
                                <button class="action-btn danger" title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(obj); }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </Show>
        </div>
        <Show when={state.previewObject}><PreviewPanel/></Show>
      </div>

      
      <Show when={state.objects.length > 0 && !state.loadingObjects}>
        <div class="shortcuts-bar">
          <span><kbd>Ctrl+A</kbd> Select all</span>
          <span><kbd>Ctrl+U</kbd> Upload</span>
          <span><kbd>Ctrl+D</kbd> Download selected</span>
          <span><kbd>Del</kbd> Delete selected</span>
          <span><kbd>Ctrl+R</kbd> Refresh</span>
          <span><kbd>Esc</kbd> Clear</span>
        </div>
      </Show>
    </div>
  );
}

export function FolderIcon(props: { size?: number } = {}) {
  const s = props.size ?? 17;
  return (<svg class="obj-icon folder-icon" width={s} height={s} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>);
}

export function FileIcon(props: { ext: string; size?: number }) {
  const s = props.size ?? 16;
  const color = () => {
    const e = props.ext.toLowerCase();
    if (['jpg','jpeg','png','gif','webp','svg','ico','avif'].includes(e)) return '#7ec8e3';
    if (['mp4','mkv','mov','avi','webm'].includes(e)) return '#b07ce3';
    if (['mp3','wav','flac','aac','ogg'].includes(e)) return '#e37cb0';
    if (['zip','tar','gz','bz2','xz','7z','rar'].includes(e)) return '#e3b07c';
    if (['pdf'].includes(e)) return '#e37c7c';
    if (['json','yaml','yml','toml','xml'].includes(e)) return '#7ce3a0';
    if (['ts','tsx','js','jsx','py','go','rs','c','cpp','java'].includes(e)) return '#7cbde3';
    return '#8888bb';
  };
  return (<svg class="obj-icon" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color()} stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>);
}
