import { useState, useRef } from 'react';
import { expenseApi } from '../services/api';
import { useTranslation } from '../contexts/LanguageContext';

interface Props {
  userId: string;
  groupId: string;
  onUploadSuccess: () => void;
}

export default function InvoiceUpload({ userId, groupId, onUploadSuccess }: Props) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('invoice', file);
      formData.append('userId', userId);
      formData.append('groupId', groupId);

      await expenseApi.uploadInvoice(formData);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess();
      alert(t.invoice.success);
    } catch (error) {
      console.error('Upload error:', error);
      alert(t.invoice.error);
    } finally {
      setUploading(false);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setUseCamera(true);
      
      // Wait for next tick to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err);
          });
        }
      }, 100);
    } catch (error) {
      console.error('Camera error:', error);
      alert(t.invoice.cameraError);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            if (fileInputRef.current) {
              fileInputRef.current.files = dataTransfer.files;
              setPreview(canvas.toDataURL('image/jpeg'));
            }
          }
        }, 'image/jpeg');
      }
      stopCamera();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">{t.invoice.title}</h3>

      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            {t.invoice.chooseFile}
          </button>
          <button
            onClick={useCamera ? stopCamera : startCamera}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            {useCamera ? t.invoice.stopCamera : t.invoice.useCamera}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {useCamera && (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-w-md rounded border"
              style={{ minHeight: '300px', backgroundColor: '#000' }}
            />
            <button
              onClick={capturePhoto}
              className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded"
            >
              {t.invoice.capturePhoto}
            </button>
          </div>
        )}

        {preview && (
          <div className="space-y-2">
            <img src={preview} alt="Preview" className="max-w-md rounded border" />
            <div className="flex gap-2">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-6 py-2 rounded"
              >
                {uploading ? t.invoice.uploading : t.invoice.upload}
              </button>
              <button
                onClick={() => setPreview(null)}
                className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
              >
                {t.invoice.cancel}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>{t.invoice.tip}</p>
      </div>
    </div>
  );
}
