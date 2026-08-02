import { For, Show } from 'solid-js';
import { state, selectBucket, selectConnection } from '../store/appStore';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function BucketList() {
  const conn = () => state.connections.find(c => c.id === state.activeConnectionId);

  return (
    <div class="bucket-list-view">
      <div class="view-header">
        <div>
          <h2 class="view-title">Buckets</h2>
          <p class="view-subtitle">{conn()?.name}</p>
        </div>
        <button class="btn-secondary" onClick={() => selectConnection(state.activeConnectionId!)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      <Show when={state.loadingBuckets}>
        <div class="loading-area">
          <div class="spinner" />
          <p>Loading buckets…</p>
        </div>
      </Show>

      <Show when={!state.loadingBuckets && state.error !== null}>
        <div class="error-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {state.error}
        </div>
      </Show>

      <Show when={!state.loadingBuckets && state.error === null}>
        <Show
          when={state.buckets.length > 0}
          fallback={
            <div class="empty-view">
              <p>No buckets found in this account.</p>
            </div>
          }
        >
          <div class="bucket-grid">
            <For each={state.buckets}>
              {(bucket) => (
                <button class="bucket-card" onClick={() => selectBucket(bucket.name)}>
                  <div class="bucket-card-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
                    </svg>
                  </div>
                  <div class="bucket-card-info">
                    <p class="bucket-card-name">{bucket.name}</p>
                    <p class="bucket-card-date">Created {formatDate(bucket.creationDate)}</p>
                  </div>
                  <svg class="bucket-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
}
