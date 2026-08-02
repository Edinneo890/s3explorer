import { Show } from 'solid-js';
import { state } from '../store/appStore';

export default function Notification() {
  return (
    <Show when={state.notification !== null}>
      <div class={`notification ${state.notification!.type}`}>
        <Show
          when={state.notification!.type === 'success'}
          fallback={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </Show>
        <span>{state.notification!.message}</span>
      </div>
    </Show>
  );
}
