import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  store: {
    getConnections: () =>
      ipcRenderer.invoke('store:getConnections'),
    saveConnection: (conn: unknown) =>
      ipcRenderer.invoke('store:saveConnection', conn),
    deleteConnection: (id: string) =>
      ipcRenderer.invoke('store:deleteConnection', id),
  },
  s3: {
    listBuckets: (conn: unknown) =>
      ipcRenderer.invoke('s3:listBuckets', conn),
    listObjects: (conn: unknown, bucket: string, prefix: string) =>
      ipcRenderer.invoke('s3:listObjects', conn, bucket, prefix),
    deleteObject: (conn: unknown, bucket: string, key: string) =>
      ipcRenderer.invoke('s3:deleteObject', conn, bucket, key),
    createFolder: (conn: unknown, bucket: string, key: string) =>
      ipcRenderer.invoke('s3:createFolder', conn, bucket, key),
    uploadFiles: (conn: unknown, bucket: string, prefix: string) =>
      ipcRenderer.invoke('s3:uploadFiles', conn, bucket, prefix),
    downloadFile: (conn: unknown, bucket: string, key: string) =>
      ipcRenderer.invoke('s3:downloadFile', conn, bucket, key),
    downloadFiles: (conn: unknown, bucket: string, keys: string[]) =>
      ipcRenderer.invoke('s3:downloadFiles', conn, bucket, keys),
    renameObject: (conn: unknown, bucket: string, oldKey: string, newKey: string) =>
      ipcRenderer.invoke('s3:renameObject', conn, bucket, oldKey, newKey),
    getObjectPreview: (conn: unknown, bucket: string, key: string) =>
      ipcRenderer.invoke('s3:getObjectPreview', conn, bucket, key),
    putObjectContent: (conn: unknown, bucket: string, key: string, content: string, contentType: string) =>
      ipcRenderer.invoke('s3:putObjectContent', conn, bucket, key, content, contentType),
  },
});
