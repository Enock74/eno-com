import React, { useState } from 'react';
import VideoUpload from './components/VideoUpload';
import CaptionTimeline from './components/CaptionTimeline';
import StylePanel from './components/StylePanel';
import ExportPanel from './components/ExportPanel';

function App() {
  const [videoId, setVideoId] = useState<number | null>(null);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '2rem', background: 'linear-gradient(135deg, #60a5fa, #a855f7)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
        ENOCOM Video Editor
      </h1>
      <VideoUpload onUploadSuccess={setVideoId} />
      {videoId && (
        <>
          <CaptionTimeline videoId={videoId} />
          <StylePanel videoId={videoId} />
          <ExportPanel videoId={videoId} />
        </>
      )}
    </div>
  );
}

export default App;