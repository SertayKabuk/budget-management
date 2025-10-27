import { useState, useEffect } from 'react';
import { fetchAuthenticatedImage } from '../services/api';

export function useAuthenticatedImage(imageUrl: string | null | undefined) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setBlobUrl(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAuthenticatedImage(imageUrl)
      .then((url) => {
        if (!cancelled) {
          setBlobUrl(url);
          setLoading(false);
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
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [imageUrl, blobUrl]);

  return { blobUrl, loading, error };
}
