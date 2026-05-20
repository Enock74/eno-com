import React, { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Caption } from '../types';

interface SortableItemProps {
  caption: Caption;
  pixelsPerSecond: number;
  onCaptionClick: (caption: Caption) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ 
  caption, 
  pixelsPerSecond, 
  onCaptionClick 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: caption.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'absolute' as const,
    left: caption.start_time * pixelsPerSecond,
    width: Math.max((caption.end_time - caption.start_time) * pixelsPerSecond, 30),
    minWidth: '30px',
    height: '50px',
    backgroundColor: isDragging ? '#3b82f6' : '#2563eb',
    borderRadius: '6px',
    cursor: 'grab',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    color: 'white',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    padding: '0 4px',
    top: '5px',
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={() => onCaptionClick(caption)}>
      {caption.text.substring(0, 20)}
    </div>
  );
};

interface VisualTimelineProps {
  captions: Caption[];
  videoDuration: number;
  onCaptionClick: (caption: Caption) => void;
  onReorderCaptions: (captionIds: number[]) => void;
}

const VisualTimeline: React.FC<VisualTimelineProps> = ({
  captions,
  videoDuration,
  onCaptionClick,
  onReorderCaptions,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(800);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (containerRef.current) {
      setTimelineWidth(containerRef.current.clientWidth);
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const pixelsPerSecond = (timelineWidth * zoomLevel) / videoDuration;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = captions.findIndex((c) => c.id === active.id);
      const newIndex = captions.findIndex((c) => c.id === over?.id);
      const newOrder = arrayMove(captions, oldIndex, newIndex);
      onReorderCaptions(newOrder.map(c => c.id));
    }
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.5, 5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.5, 0.5));

  const totalWidth = videoDuration * pixelsPerSecond;

  return (
    <div>
      {/* Zoom controls */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <button onClick={handleZoomIn} className="btn-primary" style={{ padding: '0.25rem 0.5rem' }}>Zoom In +</button>
        <button onClick={handleZoomOut} className="btn-primary" style={{ padding: '0.25rem 0.5rem' }}>Zoom Out -</button>
        <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{Math.round(zoomLevel * 100)}%</span>
      </div>

      <div
        ref={containerRef}
        style={{
          width: '100%',
          overflowX: 'auto',
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          padding: '8px 0',
        }}
      >
        <div style={{ width: totalWidth, position: 'relative', minHeight: '80px' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={captions.map(c => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              {captions.map((caption) => (
                <SortableItem
                  key={caption.id}
                  caption={caption}
                  pixelsPerSecond={pixelsPerSecond}
                  onCaptionClick={onCaptionClick}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Time ruler */}
          <div
            style={{
              position: 'absolute',
              bottom: '-20px',
              left: 0,
              right: 0,
              display: 'flex',
              fontSize: '10px',
              color: '#9ca3af',
            }}
          >
            {Array.from({ length: Math.floor(videoDuration / 10) + 1 }, (_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${i * 10 * pixelsPerSecond}px`,
                  transform: 'translateX(-50%)',
                }}
              >
                {i * 10}s
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualTimeline;