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

    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
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
      if (onReady) onReady();
    });

    wavesurferRef.current.on('seek', () => {
      if (onSeek && wavesurferRef.current) {
        onSeek(wavesurferRef.current.getCurrentTime());
      }
    });

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [audioUrl]);

  return <div ref={containerRef} style={{ width: '100%' }} />;
};

export default AudioWaveform;