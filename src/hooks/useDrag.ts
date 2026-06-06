import { useCallback, useRef, useEffect } from 'react';

interface UseDragOptions {
  onDrag: (delta: { x: number; y: number }) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function useDrag({ onDrag, onDragStart, onDragEnd }: UseDragOptions) {
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only left mouse button
      if (e.button !== 0) return;

      isDragging.current = true;
      startPos.current = { x: e.clientX, y: e.clientY };
      onDragStart?.();

      e.preventDefault();
    },
    [onDragStart]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const delta = {
        x: e.clientX - startPos.current.x,
        y: e.clientY - startPos.current.y,
      };

      startPos.current = { x: e.clientX, y: e.clientY };
      onDrag(delta);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        onDragEnd?.();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onDrag, onDragEnd]);

  return { handleMouseDown };
}
