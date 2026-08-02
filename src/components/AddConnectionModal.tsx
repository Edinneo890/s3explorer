import { createSignal, Show } from 'solid-js';
import { state, saveConnection, closeAddModal } from '../store/appStore';
import type { Connection } from '../../shared/types';

const REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'ca-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3',
  'eu-central-1', 'eu-north-1', 'ap-southeast-1', 'ap-southeast-2',
  'ap-northeast-1', 'ap-northeast-2', 'ap-south-1', 'sa-east-1',
];

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function AddConnectionModal() {
  const editing = () => state.editingConnection;

  const [name, setName] = createSignal(editing()?.name ?? '');
  const [accessKey, setAccessKey] = createSignal(editing()?.accessKeyId ?? '');
  const [secretKey, setSecretKey] = createSignal(editing()?.secretAccessKey ?? '');
  const [region, setRegion] = createSignal(
    REGIONS.includes(editing()?.region ?? '') ? editing()!.region : (editing()?.region ? 'custom' : 'us-east-1')
  );
  const [customRegion, setCustomRegion] = createSignal(
    REGIONS.includes(editing()?.region ?? '') ? '' : (editing()?.region ?? '')
  );
  const [endpoint, setEndpoint] = createSignal(editing()?.endpoint ?? '');
  const [showSecret, setShowSecret] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal('');

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError('');

    const finalRegion = region() === 'custom' ? customRegion().trim() : region();
    if (!name().trim()) { setError('Connection name is required'); return; }
    if (!accessKey().trim()) { setError('Access Key ID is required'); return; }
    if (!secretKey().trim()) { setError('Secret Access Key is required'); return; }
    if (!finalRegion) { setError('Region is required'); return; }

    setSaving(true);
    try {
      const conn: Connection = {
        id: editing()?.id ?? generateId(),
        name: name().trim(),
        accessKeyId: accessKey().trim(),
        secretAccessKey: secretKey(),
        region: finalRegion,
        ...(endpoint().trim() ? { endpoint: endpoint().trim() } : {}),
      };
      await saveConnection(conn);
      closeAddModal();
    } catch (e: any) {
      setError(e.message ?? 'Failed to save connection');
      setSaving(false);
    }
  }

  return (
    <div class="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeAddModal(); }}>
      <div class="modal">
        <div class="modal-header">
          <h2>{editing() ? 'Edit Connection' : 'Add Connection'}</h2>
          <button class="modal-close" onClick={closeAddModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form class="modal-body" onSubmit={handleSubmit}>
          <div class="form-group">
            <label class="form-label">Connection Name</label>
            <input
              class="form-input"
              type="text"
              placeholder="e.g. My AWS Account"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              autocomplete="off"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Access Key ID</label>
              <input
                class="form-input"
                type="text"
                placeholder="AKIA…"
                value={accessKey()}
                onInput={(e) => setAccessKey(e.currentTarget.value)}
                autocomplete="off"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Secret Access Key</label>
              <div class="input-with-toggle">
                <input
                  class="form-input"
                  type={showSecret() ? 'text' : 'password'}
                  placeholder="Your secret key"
                  value={secretKey()}
                  onInput={(e) => setSecretKey(e.currentTarget.value)}
                  autocomplete="new-password"
                />
                <button
                  type="button"
                  class="toggle-secret"
                  onClick={() => setShowSecret(v => !v)}
                  title={showSecret() ? 'Hide' : 'Show'}
                >
                  <Show when={showSecret()} fallback={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  }>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </Show>
                </button>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Region</label>
              <select
                class="form-select"
                value={region()}
                onChange={(e) => setRegion(e.currentTarget.value)}
              >
                {REGIONS.map(r => <option value={r}>{r}</option>)}
                <option value="custom">Custom…</option>
              </select>
            </div>

            <Show when={region() === 'custom'}>
              <div class="form-group">
                <label class="form-label">Custom Region</label>
                <input
                  class="form-input"
                  type="text"
                  placeholder="e.g. auto"
                  value={customRegion()}
                  onInput={(e) => setCustomRegion(e.currentTarget.value)}
                />
              </div>
            </Show>
          </div>

          <div class="form-group">
            <label class="form-label">
              Custom Endpoint
              <span class="form-label-optional">(optional – for MinIO, Cloudflare R2, Backblaze B2, etc.)</span>
            </label>
            <input
              class="form-input"
              type="url"
              placeholder="https://your-endpoint.example.com"
              value={endpoint()}
              onInput={(e) => setEndpoint(e.currentTarget.value)}
            />
          </div>

          <Show when={error()}>
            <p class="form-error">{error()}</p>
          </Show>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" onClick={closeAddModal}>
              Cancel
            </button>
            <button type="submit" class="btn-primary" disabled={saving()}>
              {saving() ? 'Saving…' : (editing() ? 'Save Changes' : 'Add Connection')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
