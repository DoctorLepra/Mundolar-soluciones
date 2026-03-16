'use client';

import React, { useState, useRef } from 'react';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { convertToWebP } from '@/lib/image-utils';

interface CMSImageUploadProps {
  onUploadComplete: (url: string | string[]) => void;
  folder?: string;
  className?: string;
  buttonClassName?: string;
  label?: string;
  icon?: React.ReactNode;
  multiple?: boolean;
}

export default function CMSImageUpload({ 
  onUploadComplete, 
  folder = 'cms', 
  className = '',
  buttonClassName = '',
  label = 'Subir Imagen',
  icon = <Upload size={14} />,
  multiple = false
}: CMSImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMulti, setIsMulti] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);
    setIsMulti(files.length > 1);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 1. Convert to WebP
        const webpBlob = await convertToWebP(file);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.webp`;

        // 2. Get presigned URL
        const presignedRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName,
            contentType: 'image/webp',
            folder
          })
        });

        if (!presignedRes.ok) {
          const errorData = await presignedRes.json();
          throw new Error(errorData.error || 'Error al obtener URL firmada');
        }
        
        const { signedUrl, publicUrl } = await presignedRes.json();

        // 3. Upload to R2
        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          body: webpBlob,
          headers: { 'Content-Type': 'image/webp' }
        });

        if (!uploadRes.ok) throw new Error(`Error al subir archivo ${i + 1} a R2`);

        uploadedUrls.push(publicUrl);
        setProgress(((i + 1) / files.length) * 100);
      }

      if (multiple) {
        onUploadComplete(uploadedUrls);
      } else {
        onUploadComplete(uploadedUrls[0]);
      }
    } catch (error: any) {
      console.error('Error in upload process:', error);
      alert(`Error al subir la imagen: ${error.message || 'Por favor intente de nuevo.'}`);
    } finally {
      setUploading(false);
      setProgress(0);
      setIsMulti(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept="image/*"
        multiple={multiple}
        className="hidden"
      />
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
        disabled={uploading}
        className={buttonClassName || "flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all disabled:opacity-50 w-full justify-center border border-slate-200 hover:border-slate-300 shadow-sm active:scale-95"}
        type="button"
      >
        {uploading ? <Loader2 size={14} className="animate-spin text-primary" /> : icon}
        {uploading 
          ? `Subiendo... ${isMulti ? `(${Math.round(progress)}%)` : ''}` 
          : label
        }
      </button>
    </div>
  );
}
