import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface AudioWaveformProps {
  audioUrl: string;
  onReady?: () => void;
  onSeek?: (time: number) => void;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ audioUrl, onReady, onSeek }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    let isMounted = true;
    const container = containerRef.current;

    // Clean up previous instance
    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.destroy();
      } catch (err) {
        console.error('Error destroying previous wavesurfer:', err);
      }
      wavesurferRef.current = null;
    }

    // Clear container inner HTML to remove any leftover canvas elements
    container.innerHTML = '';

    const initWaveSurfer = async () => {
      try {
        wavesurferRef.current = WaveSurfer.create({
          container: container,
          waveColor: '#4f46e5',
          progressColor: '#818cf8',
          cursorColor: '#facc15',
          barWidth: 2,
          barRadius: 3,
          cursorWidth: 2,
          height: 80,
          barGap: 1,
        });

        wavesurferRef.current.load(audioUrl);

        wavesurferRef.current.on('ready', () => {
          if (isMounted && onReady) onReady();
        });

        // Add click handler manually
        const handleClick = (e: MouseEvent) => {
          if (!wavesurferRef.current) return;
          const rect = container.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const percent = Math.max(0, Math.min(1, x / rect.width));
          const duration = wavesurferRef.current.getDuration();
          const time = percent * duration;
          if (onSeek) onSeek(time);
          wavesurferRef.current.seekTo(percent);
        };

        container.addEventListener('click', handleClick);
      } catch (err) {
        console.error('WaveSurfer initialization error:', err);
      }
    };

    initWaveSurfer();

    return () => {
      isMounted = false;
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
        } catch (err) {
          console.error('WaveSurfer destroy error:', err);
        }
        wavesurferRef.current = null;
      }
    };
  }, [audioUrl]);

  return <div ref={containerRef} style={{ width: '100%', minHeight: '80px' }} />;
};

export default AudioWaveform;