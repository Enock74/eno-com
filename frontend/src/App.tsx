import React, { useState, useEffect } from 'react';
import VideoUpload from './components/VideoUpload';
import CaptionTimeline from './components/CaptionTimeline';
import StylePanel from './components/StylePanel';
import ExportPanel from './components/ExportPanel';
import { getCaptions } from './services/api';
import './dark-theme.css';

function App() {
  const [videoId, setVideoId] = useState<number | null>(null);
  const [captionsReady, setCaptionsReady] = useState(false);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!videoId) return;
    setCaptionsReady(false);
    setPolling(true);

    let attempts = 0;
    const maxAttempts = 30; // 30 * 2 seconds = 60 seconds max wait
    const pollInterval = setInterval(async () => {
      attempts++;
      try {
        const res = await getCaptions(videoId);
        if (res.data && res.data.length > 0) {
          // Captions are ready
          clearInterval(pollInterval);
          setCaptionsReady(true);
          setPolling(false);
        } else if (attempts >= maxAttempts) {
          // Timeout – stop polling
          clearInterval(pollInterval);
          setPolling(false);
          alert('Transcription is taking longer than expected. Please refresh the page later.');
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 2000); // check every 2 seconds

    return () => clearInterval(pollInterval);
  }, [videoId]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '2rem',
        background: 'linear-gradient(135deg, #60a5fa, #a855f7)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent'
      }}>
        ENOCOM Video Editor
      </h1>
      <VideoUpload onUploadSuccess={setVideoId} />
      {videoId && (
        <>
          {polling && (
            <div className="card" style={{ textAlign: 'center', marginTop: '2rem' }}>
              <p>Transcribing audio... Please wait.</p>
              <div className="spinner"></div>
            </div>
          )}
          {captionsReady && (
            <>
              <CaptionTimeline videoId={videoId} />
              <StylePanel videoId={videoId} />
              <ExportPanel videoId={videoId} />
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;