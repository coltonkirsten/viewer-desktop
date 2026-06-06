import { useState, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import { useAppContext } from '../AppContext';
import type { AppProps } from '../types';

export function ImageViewer({ filePath }: AppProps) {
  const { fileApi } = useAppContext();

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const loadImage = useCallback(async () => {
    if (!filePath) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fileApi.readFile(filePath);
      // The API returns base64 data URL for images
      setImageSrc(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load image');
    } finally {
      setLoading(false);
    }
  }, [filePath, fileApi]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 400));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoom(100);
    setRotation(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--holo-muted)]">
        Loading image...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        {error}
      </div>
    );
  }

  if (!imageSrc) {
    return null;
  }

  const fileName = filePath?.split('/').pop() || 'Image';

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--holo-border)] bg-[rgba(15,15,25,0.5)]">
        <span className="text-xs text-[var(--holo-muted)]">{fileName}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-[var(--holo-muted)] w-12 text-center">{zoom}%</span>
          <button
            onClick={handleZoomIn}
            className="p-1 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-[var(--holo-border)] mx-1" />
          <button
            onClick={handleRotate}
            className="p-1 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
            title="Rotate"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-1 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
            title="Reset"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image container */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[rgba(0,0,0,0.3)]">
        <img
          src={imageSrc}
          alt={fileName}
          className="transition-transform duration-200"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            maxWidth: zoom <= 100 ? '100%' : 'none',
            maxHeight: zoom <= 100 ? '100%' : 'none',
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  );
}
