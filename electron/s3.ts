import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createReadStream, writeFileSync } from 'fs';
import type { Connection, S3Bucket, S3Object } from '../shared/types';

function createClient(conn: Connection): S3Client {
  const config: ConstructorParameters<typeof S3Client>[0] = {
    region: conn.region || 'us-east-1',
    credentials: {
      accessKeyId: conn.accessKeyId,
      secretAccessKey: conn.secretAccessKey,
    },
  };
  if (conn.endpoint) {
    (config as any).endpoint = conn.endpoint;
    (config as any).forcePathStyle = true;
  }
  return new S3Client(config);
}

export async function listBuckets(conn: Connection): Promise<S3Bucket[]> {
  const client = createClient(conn);
  const res = await client.send(new ListBucketsCommand({}));
  return (res.Buckets ?? []).map(b => ({
    name: b.Name!,
    creationDate: b.CreationDate?.toISOString(),
  }));
}

export async function listObjects(
  conn: Connection,
  bucket: string,
  prefix: string = '',
): Promise<S3Object[]> {
  const client = createClient(conn);
  const res = await client.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix || undefined,
    Delimiter: '/',
  }));

  const folders: S3Object[] = (res.CommonPrefixes ?? []).map(cp => {
    const key = cp.Prefix!;
    const name = key.slice(prefix.length).replace(/\/$/, '');
    return { key, name, isFolder: true };
  });

  const files: S3Object[] = (res.Contents ?? [])
    .filter(obj => obj.Key !== (prefix || undefined))
    .map(obj => ({
      key: obj.Key!,
      name: obj.Key!.slice(prefix.length),
      size: obj.Size,
      lastModified: obj.LastModified?.toISOString(),
      isFolder: false,
    }));

  return [...folders, ...files];
}

export async function uploadFile(
  conn: Connection,
  bucket: string,
  key: string,
  filePath: string,
): Promise<void> {
  const client = createClient(conn);
  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: createReadStream(filePath),
    },
  });
  await upload.done();
}

export async function downloadFile(
  conn: Connection,
  bucket: string,
  key: string,
  savePath: string,
): Promise<void> {
  const client = createClient(conn);
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await (res.Body as any).transformToByteArray();
  writeFileSync(savePath, Buffer.from(bytes));
}

export async function downloadFiles(
  conn: Connection,
  bucket: string,
  keys: string[],
  destDir: string,
): Promise<void> {
  const client = createClient(conn);
  const { mkdirSync } = await import('fs');
  mkdirSync(destDir, { recursive: true });
  for (const key of keys) {
    const fileName = key.split('/').filter(Boolean).pop() ?? key;
    const savePath = `${destDir}/${fileName}`;
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await (res.Body as any).transformToByteArray();
    writeFileSync(savePath, Buffer.from(bytes));
  }
}

export async function deleteObject(
  conn: Connection,
  bucket: string,
  key: string,
): Promise<void> {
  const client = createClient(conn);
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function createFolder(
  conn: Connection,
  bucket: string,
  folderKey: string,
): Promise<void> {
  const client = createClient(conn);
  const key = folderKey.endsWith('/') ? folderKey : folderKey + '/';
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: '' }));
}

export async function renameObject(
  conn: Connection,
  bucket: string,
  oldKey: string,
  newKey: string,
): Promise<void> {
  const client = createClient(conn);
  const isFolder = oldKey.endsWith('/');

  if (isFolder) {
    const keys: string[] = [];
    let token: string | undefined;
    do {
      const res = await client.send(new ListObjectsV2Command({
        Bucket: bucket, Prefix: oldKey, ContinuationToken: token,
      }));
      for (const obj of res.Contents ?? []) keys.push(obj.Key!);
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);

    for (const key of keys) {
      const dest = newKey + key.slice(oldKey.length);
      await client.send(new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${encodeURIComponent(key)}`,
        Key: dest,
      }));
    }
    for (const key of keys) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    }
  } else {
    await client.send(new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${encodeURIComponent(oldKey)}`,
      Key: newKey,
    }));
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: oldKey }));
  }
}

const TEXT_EXT = /\.(txt|md|json|jsonl|yaml|yml|toml|xml|csv|log|sh|bash|zsh|conf|ini|env|py|js|ts|jsx|tsx|go|rs|cpp|c|h|java|rb|php|sql|css|scss|html|htm|svg|gitignore|dockerfile|makefile)$/i;
const MAX_TEXT = 512 * 1024;  
const MAX_IMG  = 10 * 1024 * 1024; 

export async function getObjectPreview(
  conn: Connection,
  bucket: string,
  key: string,
): Promise<{ content: string; contentType: string; size: number; kind: 'image' | 'text' | 'none' }> {
  const client = createClient(conn);
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const contentType = res.ContentType ?? 'application/octet-stream';
  const size = res.ContentLength ?? 0;

  const isImage = /^image\//.test(contentType) || /\.(jpg|jpeg|png|gif|webp|svg|ico|avif|bmp)$/i.test(key);
  const isText  = /^(text\/|application\/json|application\/xml)/.test(contentType) || TEXT_EXT.test(key);

  if (isImage && size <= MAX_IMG) {
    const bytes = await (res.Body as any).transformToByteArray();
    return { content: Buffer.from(bytes).toString('base64'), contentType, size, kind: 'image' };
  }
  if (isText && size <= MAX_TEXT) {
    const bytes = await (res.Body as any).transformToByteArray();
    return { content: Buffer.from(bytes).toString('utf-8'), contentType, size, kind: 'text' };
  }
  
  await (res.Body as any).transformToByteArray().catch(() => {});
  return { content: '', contentType, size, kind: 'none' };
}

export async function putObjectContent(
  conn: Connection,
  bucket: string,
  key: string,
  content: string,
  contentType: string,
): Promise<void> {
  const client = createClient(conn);
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: content,
    ContentType: contentType || 'text/plain',
  }));
}
