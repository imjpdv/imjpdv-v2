import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

export default function ImageLightbox({ src, alt, open, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTap, setLastTap] = useState(0);
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  const MIN_SCALE = 1;
  const MAX_SCALE = 3;

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ESC key to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Wheel zoom (desktop)
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
    if (scale + delta <= 1) setPosition({ x: 0, y: 0 });
  }, [scale]);

  // Click to toggle zoom (desktop)
  const handleImageClick = (e) => {
    e.stopPropagation();
    if (isDragging) return;
    
    // Double tap detection for mobile
    const now = Date.now();
    if (now - lastTap < 300) {
      // Double tap/click
      if (scale > 1) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      } else {
        setScale(2);
      }
      setLastTap(0);
    } else {
      setLastTap(now);
    }
  };

  // Mouse drag (desktop)
  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch handlers (mobile)
  const handleTouchStart = (e) => {
    if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging && scale > 1) {
      e.preventDefault();
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
    
    // Pinch to zoom
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      if (!containerRef.current.lastPinchDistance) {
        containerRef.current.lastPinchDistance = distance;
        return;
      }
      
      const delta = (distance - containerRef.current.lastPinchDistance) * 0.01;
      containerRef.current.lastPinchDistance = distance;
      
      setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
    }
  };

  const handleTouchEnd = (e) => {
    setIsDragging(false);
    if (containerRef.current) {
      containerRef.current.lastPinchDistance = null;
    }
    
    // Swipe down to close
    if (e.changedTouches.length === 1 && scale <= 1) {
      const touch = e.changedTouches[0];
      if (containerRef.current.touchStartY !== undefined) {
        const deltaY = touch.clientY - containerRef.current.touchStartY;
        if (deltaY > 100) onClose();
      }
    }
    containerRef.current.touchStartY = undefined;
  };

  const handleTouchStartContainer = (e) => {
    if (e.touches.length === 1) {
      containerRef.current.touchStartY = e.touches[0].clientY;
    }
  };

  // Zoom buttons
  const zoomIn = (e) => {
    e.stopPropagation();
    setScale(prev => Math.min(MAX_SCALE, prev + 0.5));
  };

  const zoomOut = (e) => {
    e.stopPropagation();
    const newScale = Math.max(MIN_SCALE, scale - 0.5);
    setScale(newScale);
    if (newScale <= 1) setPosition({ x: 0, y: 0 });
  };

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStartContainer}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
        aria-label="Fechar"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Zoom controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        <button
          onClick={zoomOut}
          disabled={scale <= MIN_SCALE}
          className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-40 flex items-center justify-center text-white transition-colors"
          aria-label="Diminuir zoom"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <span className="flex items-center justify-center px-3 text-white text-sm bg-black/50 rounded-full min-w-[60px]">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={zoomIn}
          disabled={scale >= MAX_SCALE}
          className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-40 flex items-center justify-center text-white transition-colors"
          aria-label="Aumentar zoom"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
      </div>

      {/* Image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onClick={handleImageClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className="select-none transition-transform duration-100"
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          objectFit: 'contain',
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
        }}
        draggable={false}
      />

      {/* Instructions */}
      <p className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/60 text-xs text-center">
        Duplo clique para zoom • ESC para fechar
      </p>
    </div>
  );
}