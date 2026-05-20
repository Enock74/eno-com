import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { Caption } from '../types';

interface PlayerTimelineProps {
  videoUrl: string;
  captions: Caption[];
  onTimeUpdate?: (time: number) => void;
  onCaptionClick?: (caption: Caption) => void;
}

const PlayerTimeline: React.FC<PlayerTimelineProps> = ({ 
  videoUrl, 
  captions, 
  onTimeUpdate,
  onCaptionClick 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeCaptionId, setActiveCaptionId] = useState<number | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    playerRef.current = videojs(videoRef.current, {
      controls: true,
      autoplay: false,
      preload: 'auto',
      fluid: true,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      controlBar: {
        children: [
          'playToggle',
          'volumePanel',
          'currentTimeDisplay',
          'timeDivider',
          'durationDisplay',
          'progressControl',
          'playbackRateMenuButton',
          'fullscreenToggle'
        ]
      }
    });

    playerRef.current.on('timeupdate', () => {
      const time = playerRef.current.currentTime();
      setCurrentTime(time);
      if (onTimeUpdate) onTimeUpdate(time);
      
      // Find active caption
      const active = captions.find(c => time >= c.start_time && time <= c.end_time);
      setActiveCaptionId(active?.id || null);
    });

    playerRef.current.on('loadedmetadata', () => {
      setDuration(playerRef.current.duration());
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, [videoUrl]);

  // Seek to specific time
  const seekTo = (time: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime(time);
      playerRef.current.play();
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercent = (currentTime / duration) * 100;

  return (
    <div className="card">
      <h2 className="card-title">Video Preview</h2>
      
      {/* Video Player */}
      <div data-vjs-player>
        <video ref={videoRef} className="video-js vjs-big-play-centered" style={{ borderRadius: '8px' }}>
          <source src={videoUrl} type="video/mp4" />
          <p className="vjs-no-js">To view this video please enable JavaScript.</p>
        </video>
      </div>
      
      {/* Caption Timeline Preview */}
      {captions.length > 0 && (
        <div className="mt-4">
          <label className="block text-sm text-gray-400 mb-2">Caption Timeline</label>
          <div 
            className="relative bg-gray-800 rounded-lg h-16 overflow-hidden cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percent = x / rect.width;
              seekTo(percent * duration);
            }}
          >
            {/* Progress bar */}
            <div 
              className="absolute top-0 left-0 h-full bg-blue-600 opacity-30"
              style={{ width: `${progressPercent}%` }}
            />
            
            {/* Caption blocks */}
            {captions.map((cap, idx) => {
              const leftPercent = (cap.start_time / duration) * 100;
              const widthPercent = ((cap.end_time - cap.start_time) / duration) * 100;
              const isActive = activeCaptionId === cap.id;
              
              return (
                <div
                  key={cap.id}
                  className={`absolute top-1 h-12 rounded cursor-pointer transition-all ${
                    isActive ? 'bg-yellow-500 border-2 border-yellow-300' : 'bg-blue-500 hover:bg-blue-400'
                  }`}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${Math.max(widthPercent, 0.5)}%`,
                    minWidth: '4px'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    seekTo(cap.start_time);
                    if (onCaptionClick) onCaptionClick(cap);
                  }}
                  title={`${formatTime(cap.start_time)} - ${formatTime(cap.end_time)}: ${cap.text.substring(0, 50)}`}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-white text-xs truncate px-1">
                    {widthPercent > 5 && cap.text.substring(0, 15)}
                  </span>
                </div>
              );
            })}
            
            {/* Playhead marker */}
            <div 
              className="absolute top-0 w-0.5 h-full bg-white z-10"
              style={{ left: `${progressPercent}%` }}
            >
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rounded-full" />
            </div>
          </div>
          
          {/* Time labels */}
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          
          {/* Current caption display */}
          {activeCaptionId && (
            <div className="mt-3 p-2 bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-400">Current caption:</span>
              <p className="text-sm text-white mt-1">
                {captions.find(c => c.id === activeCaptionId)?.text}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerTimeline;