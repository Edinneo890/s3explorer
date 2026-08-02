export interface Connection {
  id: string;
  name: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpoint?: string;
}

export interface S3Bucket {
  name: string;
  creationDate?: string;
}

export interface S3Object {
  key: string;
  name: string;
  size?: number;
  lastModified?: string;
  isFolder: boolean;
}

export interface IpcResult<T> {
  data?: T;
  error?: string;
}

export interface PreviewData {
  content: string;
  contentType: string;
  size: number;
  kind: 'image' | 'text' | 'none';
}
