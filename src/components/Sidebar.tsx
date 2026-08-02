import { For, Show, createMemo } from 'solid-js';
import {
  state, selectConnection, selectBucket, navigateTo,
  removeConnection, openAddModal, toggleTreeNode, loadTreeNode,
} from '../store/appStore';
import type { Connection } from '../../shared/types';

export default function Sidebar() {
  return (
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="app-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
            <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
          </svg>
          <span>S3 Explorer</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <p class="nav-label">CONNECTIONS</p>
        <For each={state.connections} fallback={<p class="nav-empty">No connections yet.<br/>Add one below.</p>}>
          {(conn) => <ConnItem conn={conn}/>}
        </For>
      </nav>

      <div class="sidebar-footer">
        <button class="btn-add-conn" onClick={() => openAddModal()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Connection
        </button>
      </div>
    </aside>
  );
}

function ConnItem(props: { conn: Connection }) {
  const isActive = () => state.activeConnectionId === props.conn.id;
  return (
    <div class="nav-conn-group">
      <div
        class={`nav-conn${isActive() ? ' active' : ''}`}
        role="button" tabIndex={0}
        onClick={() => selectConnection(props.conn.id)}
        onKeyDown={(e) => e.key === 'Enter' && selectConnection(props.conn.id)}
        title={props.conn.endpoint ?? `${props.conn.region} — AWS`}
      >
        <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
        </svg>
        <span class="nav-conn-name">{props.conn.name}</span>
        <span class="nav-conn-region">{props.conn.endpoint ? 'custom' : props.conn.region}</span>
        <div class="nav-conn-actions">
          <button class="icon-btn" title="Edit" onClick={(e) => { e.stopPropagation(); openAddModal(props.conn); }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn danger" title="Remove" onClick={(e) => { e.stopPropagation(); handleDelete(props.conn.id); }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>

      <Show when={isActive()}>
        <Show when={state.loadingBuckets}>
          <div class="nav-loading">Loading buckets…</div>
        </Show>
        <Show when={!state.loadingBuckets && state.error !== null && state.currentBucket === null}>
          <div class="nav-error">{state.error}</div>
        </Show>
        <div class="nav-buckets">
          <For each={state.buckets}>
            {(bucket) => {
              const isCurrent = () => state.currentBucket === bucket.name;
              return (
                <div class="nav-bucket-group">
                  <button
                    class={`nav-bucket${isCurrent() ? ' active' : ''}`}
                    onClick={() => selectBucket(bucket.name)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <ellipse cx="12" cy="5" rx="9" ry="3"/>
                      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
                      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
                    </svg>
                    <span>{bucket.name}</span>
                  </button>

                  
                  <Show when={isCurrent() && state.treeNodes[''] !== undefined}>
                    <div class="tree-root">
                      <FolderTree prefix="" depth={0}/>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}

function FolderTree(props: { prefix: string; depth: number }) {
  const children = () => state.treeNodes[props.prefix] ?? [];
  const isLoading = () => state.treeLoading.includes(props.prefix);

  return (
    <For each={children()}>
      {(childKey) => <TreeNode nodeKey={childKey} depth={props.depth}/>}
    </For>
  );
}

function TreeNode(props: { nodeKey: string; depth: number }) {
  const key = props.nodeKey; 
  const name = createMemo(() => {
    const parts = key.replace(/\/$/, '').split('/');
    return parts[parts.length - 1];
  });

  const isExpanded  = () => state.treeExpanded.includes(key);
  const hasChildren = () => (state.treeNodes[key]?.length ?? -1) !== 0; 
  const isLoading   = () => state.treeLoading.includes(key);
  const isCurrent   = () => state.currentPath === key;
  const isAncestor  = () => state.currentPath.startsWith(key) && state.currentPath !== key;

  function toggle(e: MouseEvent) {
    e.stopPropagation();
    if (!isExpanded() && state.treeNodes[key] === undefined) {
      loadTreeNode(key);
    }
    toggleTreeNode(key);
  }

  return (
    <div class="tree-node">
      <div
        class={`tree-item${isCurrent() ? ' tree-current' : ''}${isAncestor() ? ' tree-ancestor' : ''}`}
        style={`padding-left: ${12 + props.depth * 14}px`}
        onClick={() => navigateTo(key)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigateTo(key)}
      >
        
        <button
          class={`tree-toggle${(state.treeNodes[key] !== undefined && state.treeNodes[key].length === 0) ? ' tree-toggle-hidden' : ''}`}
          onClick={toggle}
          title={isExpanded() ? 'Collapse' : 'Expand'}
        >
          <Show when={isLoading()}>
            <div class="tree-spinner"/>
          </Show>
          <Show when={!isLoading()}>
            <svg
              width="10" height="10" viewBox="0 0 10 10"
              style={`transform: rotate(${isExpanded() ? 90 : 0}deg); transition: transform 0.15s`}
              fill="currentColor"
            >
              <path d="M3 2l4 3-4 3V2z"/>
            </svg>
          </Show>
        </button>

        
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"
          class={`tree-folder-icon${isCurrent()||isAncestor() ? ' active' : ''}`}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>

        <span class="tree-name">{name()}</span>
      </div>

      
      <Show when={isExpanded() && state.treeNodes[key]}>
        <FolderTree prefix={key} depth={props.depth + 1}/>
      </Show>
    </div>
  );
}

function handleDelete(id: string): void {
  if (window.confirm('Remove this connection? Your S3 data will not be deleted.')) {
    removeConnection(id);
  }
}
