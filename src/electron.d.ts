import type { Connection, S3Bucket, S3Object, PreviewData } from '../shared/types';

interface IpcResult<T> {
  data?: T;
  error?: string;
}

interface ElectronAPI {
  store: {
    getConnections(): Promise<Connection[]>;
    saveConnection(conn: Connection): Promise<{ ok: boolean }>;
    deleteConnection(id: string): Promise<{ ok: boolean }>;
  };
  s3: {
    listBuckets(conn: Connection): Promise<IpcResult<S3Bucket[]>>;
    listObjects(conn: Connection, bucket: string, prefix: string): Promise<IpcResult<S3Object[]>>;
    deleteObject(conn: Connection, bucket: string, key: string): Promise<IpcResult<boolean>>;
    createFolder(conn: Connection, bucket: string, key: string): Promise<IpcResult<boolean>>;
    uploadFiles(conn: Connection, bucket: string, prefix: string): Promise<IpcResult<number | null>>;
    downloadFile(conn: Connection, bucket: string, key: string): Promise<IpcResult<string | null>>;
    downloadFiles(conn: Connection, bucket: string, keys: string[]): Promise<IpcResult<number | null>>;
    renameObject(conn: Connection, bucket: string, oldKey: string, newKey: string): Promise<IpcResult<boolean>>;
    getObjectPreview(conn: Connection, bucket: string, key: string): Promise<IpcResult<PreviewData>>;
    putObjectContent(conn: Connection, bucket: string, key: string, content: string, contentType: string): Promise<IpcResult<boolean>>;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
