import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let s3ClientInstance: S3Client | null = null;

function getS3Client() {
  if (s3ClientInstance) return s3ClientInstance;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    const missing = [];
    if (!accountId) missing.push('R2_ACCOUNT_ID');
    if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID');
    if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
    throw new Error(`Missing required R2 environment variables: ${missing.join(', ')}`);
  }

  s3ClientInstance = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });

  return s3ClientInstance;
}

export async function POST(request: NextRequest) {
  try {
    const { fileName, contentType, folder } = await request.json();

    if (!fileName || !contentType || !folder) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Security check: validate folder name to prevent arbitrary path traversal
    const allowedFolders = ['productos', 'categorias', 'marcas', 'cms'];
    if (!allowedFolders.includes(folder)) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
    }

    const key = `${folder}/${fileName}`;

    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    // Generate signed URL valid for 5 minutes
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 300 });

    const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ signedUrl, publicUrl });
  } catch (error: any) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { publicUrl } = await request.json();

    if (!publicUrl) {
      return NextResponse.json({ error: 'Missing publicUrl' }, { status: 400 });
    }

    // Extract key from public URL
    // Format: https://pub-xxx.r2.dev/folder/filename.webp
    const url = new URL(publicUrl);
    const key = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;

    const client = getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    await client.send(command);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
        return NextResponse.json({ success: true, message: 'Object already deleted' });
    }
    console.error('Error deleting object from R2:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
