import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(request: NextRequest) {
  try {
    const { fileName, contentType, folder } = await request.json();

    if (!fileName || !contentType || !folder) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Security check: validate folder name to prevent arbitrary path traversal
    const allowedFolders = ['productos', 'categorias', 'marcas'];
    if (!allowedFolders.includes(folder)) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
    }

    const key = `${folder}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    // Generate signed URL valid for 5 minutes
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

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

    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
        return NextResponse.json({ success: true, message: 'Object already deleted' });
    }
    console.error('Error deleting object from R2:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
