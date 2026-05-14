import React, { useRef, useEffect, useState } from 'react';
import { Caption } from '../types';

interface VisualTimelineProps {
  captions: Caption[];
  videoDuration: number;
  onCaptionClick: (caption: Caption) => void;
  onCaptionResize: (captionId: number, newStart: number, newEnd: number) => void;
  onCaptionDrag: (captionId: number, newStart: number) => void;
}

const VisualTimeline: React.FC<VisualTimelineProps> = ({
  captions,
  videoDuration,
  onCaptionClick,
  onCaptionResize,
  onCaptionDrag
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState<{ id: number; type: 'move' | 'resize-left' | 'resize-right'; startX: number; originalStart: number; originalEnd: number } | null>(null);
  const [hoveredCaption, setHoveredCaption] = useState<number | null>(null);

  const pixelsPerSecond = (canvasWidth: number) => canvasWidth / videoDuration;

  const drawTimeline = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const pps = pixelsPerSecond(width);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background grid (seconds)
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px monospace';
    
    for (let s = 0; s <= videoDuration; s += 5) {
      const x = s * pps;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.fillText(`${s}s`, x + 2, 12);
    }

    // Draw captions as bars
    captions.forEach(cap => {
      const x = cap.start_time * pps;
      const w = (cap.end_time - cap.start_time) * pps;
      const y = 20;
      const h = height - 40;
      
      // Highlight hovered caption
      if (hoveredCaption === cap.id) {
        ctx.fillStyle = '#3b82f6';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#60a5fa';
      } else {
        ctx.fillStyle = '#1e40af';
        ctx.shadowBlur = 0;
      }
      
      ctx.fillRect(x, y, w, h);
      
      // Draw border
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
      
      // Draw resize handles
      ctx.fillStyle = '#facc15';
      ctx.fillRect(x - 3, y + h/2 - 5, 6, 10);
      ctx.fillRect(x + w - 3, y + h/2 - 5, 6, 10);
      
      // Draw text (if enough space)
      if (w > 50) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.fillText(cap.text.substring(0, 20), x + 5, y + h/2 + 3);
      }
    });
  };

  useEffect(() => {
    drawTimeline();
  }, [captions, videoDuration, hoveredCaption]);

  // Handle mouse events for dragging/resizing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const pps = pixelsPerSecond(canvas.width);
    const timeAtX = mouseX / pps;
    
    // Find which caption and handle (left, right, or body)
    for (let i = captions.length - 1; i >= 0; i--) {
      const cap = captions[i];
      const left = cap.start_time * pps;
      const right = cap.end_time * pps;
      const handleSize = 6;
      
      // Check resize handles
      if (Math.abs(mouseX - left) < handleSize) {
        setDragging({
          id: cap.id,
          type: 'resize-left',
          startX: mouseX,
          originalStart: cap.start_time,
          originalEnd: cap.end_time
        });
        return;
      }
      if (Math.abs(mouseX - right) < handleSize) {
        setDragging({
          id: cap.id,
          type: 'resize-right',
          startX: mouseX,
          originalStart: cap.start_time,
          originalEnd: cap.end_time
        });
        return;
      }
      
      // Check body for drag
      if (mouseX >= left && mouseX <= right) {
        setDragging({
          id: cap.id,
          type: 'move',
          startX: mouseX,
          originalStart: cap.start_time,
          originalEnd: cap.end_time
        });
        onCaptionClick(cap);
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const pps = pixelsPerSecond(canvas.width);
    const deltaTime = (mouseX - dragging.startX) / pps;
    
    if (dragging.type === 'move') {
      const newStart = Math.max(0, dragging.originalStart + deltaTime);
      const duration = dragging.originalEnd - dragging.originalStart;
      const newEnd = Math.min(videoDuration, newStart + duration);
      onCaptionDrag(dragging.id, newStart);
      // Update end as well to maintain duration
      onCaptionResize(dragging.id, newStart, newEnd);
    } else if (dragging.type === 'resize-left') {
      let newStart = Math.max(0, dragging.originalStart + deltaTime);
      if (newStart >= dragging.originalEnd) newStart = dragging.originalEnd - 0.1;
      onCaptionResize(dragging.id, newStart, dragging.originalEnd);
    } else if (dragging.type === 'resize-right') {
      let newEnd = Math.min(videoDuration, dragging.originalEnd + deltaTime);
      if (newEnd <= dragging.originalStart) newEnd = dragging.originalStart + 0.1;
      onCaptionResize(dragging.id, dragging.originalStart, newEnd);
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleMouseMoveForHover = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const pps = pixelsPerSecond(canvas.width);
    const timeAtX = mouseX / pps;
    
    let found = null;
    for (const cap of captions) {
      if (timeAtX >= cap.start_time && timeAtX <= cap.end_time) {
        found = cap.id;
        break;
      }
    }
    setHoveredCaption(found);
  };

  // Resize canvas when window changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeObserver = new ResizeObserver(() => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = 120;
        drawTimeline();
      }
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    return () => resizeObserver.disconnect();
  }, [captions, videoDuration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvas.parentElement) {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = 120;
      drawTimeline();
    }
  }, [captions, videoDuration]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '120px', cursor: dragging ? 'grabbing' : 'pointer', backgroundColor: '#0f172a', borderRadius: '8px' }}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        handleMouseMove(e);
        handleMouseMoveForHover(e);
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};

export default VisualTimeline;