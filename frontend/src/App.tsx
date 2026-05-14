import React, { useState, useEffect } from 'react';
import VideoUpload from './components/VideoUpload';
import CaptionTimeline from './components/CaptionTimeline';
import StylePanel from './components/StylePanel';
import ExportPanel from './components/ExportPanel';
import { getCaptions } from './services/api';
import './dark-theme.css';

function App() {
  // Read videoId from URL if present
  const getVideoIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('videoId');
    return id ? parseInt(id) : null;
  };

  const [videoId, setVideoId] = useState<number | null>(getVideoIdFromUrl());
  const [captionsReady, setCaptionsReady] = useState(false);
  const [polling, setPolling] = useState(false);

  // Update URL when videoId changes
  const updateVideoId = (id: number | null) => {
    setVideoId(id);
    if (id) {
      window.history.pushState({}, '', `?videoId=${id}`);
    } else {
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  useEffect(() => {
    if (!videoId) {
      setCaptionsReady(false);
      return;
    }
    
    // Check if captions already exist
    const checkCaptions = async () => {
      try {
        const res = await getCaptions(videoId);
        if (res.data && res.data.length > 0) {
          setCaptionsReady(true);
          setPolling(false);
          return true;
        }
      } catch (err) {
        console.error('Error checking captions', err);
      }
      return false;
    };

    const init = async () => {
      const hasCaptions = await checkCaptions();
      if (hasCaptions) {
        setCaptionsReady(true);
        setPolling(false);
        return;
      }

      // No captions yet – start polling
      setCaptionsReady(false);
      setPolling(true);

      let attempts = 0;
      const maxAttempts = 300; // 300 * 5 seconds = 25 minutes max wait
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const res = await getCaptions(videoId);
          if (res.data && res.data.length > 0) {
            clearInterval(pollInterval);
            setCaptionsReady(true);
            setPolling(false);
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setPolling(false);
            alert('Transcription is taking longer than expected. Please refresh the page later.');
          }
        } catch (err) {
          console.error('Polling error', err);
        }
      }, 5000);

      return () => clearInterval(pollInterval);
    };

    init();
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
      <VideoUpload onUploadSuccess={updateVideoId} />
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