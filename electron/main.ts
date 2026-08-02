import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import {
  listBuckets,
  listObjects,
  uploadFile,
  downloadFile,
  downloadFiles,
  deleteObject,
  createFolder,
  renameObject,
  getObjectPreview,
  putObjectContent,
} from './s3';
import type { Connection } from '../shared/types';

const isDev = process.env.IS_DEV === 'true';

function storePath(): string {
  return path.join(app.getPath('userData'), 's3explorer.json');
}

function readConnections(): Connection[] {
  const p = storePath();
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as Connection[];
  } catch {
    return [];
  }
}

function writeConnections(connections: Connection[]): void {
  fs.writeFileSync(storePath(), JSON.stringify(connections, null, 2), 'utf-8');
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: '#141218',
    autoHideMenuBar: true,
    show: false,
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

ipcMain.handle('store:getConnections', () => readConnections());

ipcMain.handle('store:saveConnection', (_e, connection: Connection) => {
  const conns = readConnections();
  const idx = conns.findIndex(c => c.id === connection.id);
  if (idx >= 0) conns[idx] = connection;
  else conns.push(connection);
  writeConnections(conns);
  return { ok: true };
});

ipcMain.handle('store:deleteConnection', (_e, id: string) => {
  writeConnections(readConnections().filter(c => c.id !== id));
  return { ok: true };
});

ipcMain.handle('s3:listBuckets', async (_e, conn: Connection) => {
  try {
    return { data: await listBuckets(conn) };
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' };
  }
});

ipcMain.handle('s3:listObjects', async (_e, conn: Connection, bucket: string, prefix: string) => {
  try {
    return { data: await listObjects(conn, bucket, prefix) };
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' };
  }
});

ipcMain.handle('s3:deleteObject', async (_e, conn: Connection, bucket: string, key: string) => {
  try {
    await deleteObject(conn, bucket, key);
    return { data: true };
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' };
  }
});

ipcMain.handle('s3:createFolder', async (_e, conn: Connection, bucket: string, key: string) => {
  try {
    await createFolder(conn, bucket, key);
    return { data: true };
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' };
  }
});

ipcMain.handle('s3:renameObject', async (_e, conn: Connection, bucket: string, oldKey: string, newKey: string) => {
  try {
    await renameObject(conn, bucket, oldKey, newKey);
    return { data: true };
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' };
  }
});

ipcMain.handle('s3:getObjectPreview', async (_e, conn: Connection, bucket: string, key: string) => {
  try {
    return { data: await getObjectPreview(conn, bucket, key) };
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' };
  }
});

ipcMain.handle('s3:uploadFiles', async (_e, conn: Connection, bucket: string, prefix: string) => {
  const win = BrowserWindow.getFocusedWindow() ?? mainWindow;
  if (!win) return { error: 'No window available' };

  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'],
    title: 'Select files to upload',
  });

  if (result.canceled || result.filePaths.length === 0) return { data: null };

  try {
    for (const filePath of result.filePaths) {
      const fileName = path.basename(filePath);
      const key = prefix ? `${prefix}${fileName}` : fileName;
      await uploadFile(conn, bucket, key, filePath);
    }
    return { data: result.filePaths.length };
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' };
  }
});

ipcMain.handle('s3:downloadFile', async (_e, conn: Connection, bucket: string, key: string) => {
  const win = BrowserWindow.getFocusedWindow() ?? mainWindow;
  if (!win) return { error: 'No window available' };

  const fileName = key.split('/').filter(Boolean).pop() ?? 'download';
  const result = await dialog.showSaveDialog(win, {
    defaultPath: fileName,
    title: 'Save file as',
  });

  if (result.canceled || !result.filePath) return { data: null };

  try {
    await downloadFile(conn, bucket, key, result.filePath);
    return { data: result.filePath };
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' };
  }
});

ipcMain.handle('s3:downloadFiles', async (_e, conn: Connection, bucket: string, keys: string[]) => {
  const win = BrowserWindow.getFocusedWindow() ?? mainWindow;
  if (!win) return { error: 'No window available' };

  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
    title: `Choose destination folder for ${keys.length} file(s)`,
  });

  if (result.canceled || result.filePaths.length === 0) return { data: null };

  try {
    await downloadFiles(conn, bucket, keys, result.filePaths[0]);
    return { data: keys.length };
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' };
  }
});

ipcMain.handle('s3:putObjectContent', async (_e, conn: Connection, bucket: string, key: string, content: string, contentType: string) => {
  try {
    await putObjectContent(conn, bucket, key, content, contentType);
    return { data: true };
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' };
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
