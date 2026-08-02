import { onMount, Show } from 'solid-js';
import { state, initConnections } from './store/appStore';
import Sidebar from './components/Sidebar';
import BucketList from './components/BucketList';
import FileExplorer from './components/FileExplorer';
import EmptyState from './components/EmptyState';
import Notification from './components/Notification';
import AddConnectionModal from './components/AddConnectionModal';

export default function App() {
  onMount(() => initConnections());

  return (
    <div class="app">
      <Sidebar />
      <main class="main-content">
        <Show when={state.activeConnectionId === null}>
          <EmptyState />
        </Show>
        <Show when={state.activeConnectionId !== null && state.currentBucket === null}>
          <BucketList />
        </Show>
        <Show when={state.currentBucket !== null}>
          <FileExplorer />
        </Show>
      </main>

      <Show when={state.notification !== null}>
        <Notification />
      </Show>
      <Show when={state.showAddModal}>
        <AddConnectionModal />
      </Show>
    </div>
  );
}
