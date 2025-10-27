import { useState, useEffect, useRef } from 'react';
import { fetchAuthenticatedImage } from '../services/api';

export function useAuthenticatedImage(imageUrl: string | null | undefined) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      // Clean up previous blob URL if any
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }
      setBlobUrl(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAuthenticatedImage(imageUrl)
      .then((url) => {
        if (!cancelled) {
          // Clean up previous blob URL before setting new one
          if (currentBlobUrlRef.current) {
            URL.revokeObjectURL(currentBlobUrlRef.current);
          }
          currentBlobUrlRef.current = url;
          setBlobUrl(url);
          setLoading(false);
        } else if (url) {
          // If cancelled, revoke the newly created blob URL
          URL.revokeObjectURL(url);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      // Clean up blob URL when component unmounts or imageUrl changes
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }
    };
  }, [imageUrl]);

  return { blobUrl, loading, error };
}
