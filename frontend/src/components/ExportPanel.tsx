import React, { useState } from 'react';
import { assembleVideo } from '../services/api';

interface ExportPanelProps {
  videoId: number;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ videoId }) => {
  const [assembling, setAssembling] = useState(false);
  const [outputPath, setOutputPath] = useState('');

  const handleAssemble = async () => {
    setAssembling(true);
    try {
      const res = await assembleVideo(videoId);
      setOutputPath(res.data.output_path);
      alert('Assembly complete! Check console for path.');
      console.log('Output video:', res.data.output_path);
    } catch (err) {
      console.error('Assembly failed', err);
      alert('Assembly failed');
    } finally {
      setAssembling(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">Export</h2>
      <button onClick={handleAssemble} disabled={assembling} className="btn-primary" style={{ background: '#10b981' }}>
        {assembling ? 'Assembling...' : 'Assemble Video'}
      </button>
      {outputPath && <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#9ca3af', wordBreak: 'break-all' }}>Output: {outputPath}</p>}
    </div>
  );
};

export default ExportPanel;