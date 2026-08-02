import { openAddModal } from '../store/appStore';

export default function EmptyState() {
  return (
    <div class="empty-state">
      <div class="empty-state-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
          <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
        </svg>
      </div>
      <h2>Welcome to S3 Explorer</h2>
      <p>Connect to AWS S3, MinIO, Cloudflare R2, Backblaze B2,<br />or any S3-compatible storage.</p>
      <button class="btn-primary btn-lg" onClick={() => openAddModal()}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Your First Connection
      </button>
    </div>
  );
}
