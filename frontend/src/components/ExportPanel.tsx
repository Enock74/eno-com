import React, { useState } from 'react';
import { assembleVideo } from '../services/api';

interface ExportPanelProps {
  videoId: number;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ videoId }) => {
  const [assembling, setAssembling] = useState(false);
  const [outputPath, setOutputPath] = useState('');
  const [resolution, setResolution] = useState('1080p');
  const [quality, setQuality] = useState('medium');
  const [format, setFormat] = useState('mp4');

  const handleAssemble = async () => {
    setAssembling(true);
    try {
      const res = await assembleVideo(videoId, { resolution, quality, format });
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
      
      <div className="grid-2 mb-4">
        <div>
          <label>Resolution</label>
          <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
            <option value="720p">720p (1280×720)</option>
            <option value="1080p">1080p (1920×1080)</option>
            <option value="4k">4K (3840×2160)</option>
          </select>
        </div>
        
        <div>
          <label>Quality</label>
          <select value={quality} onChange={(e) => setQuality(e.target.value)}>
            <option value="low">Low (small file)</option>
            <option value="medium">Medium (balanced)</option>
            <option value="high">High (best quality)</option>
          </select>
        </div>
        
        <div>
          <label>Format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="mp4">MP4 (H.264)</option>
            <option value="mov">MOV (QuickTime)</option>
          </select>
        </div>
      </div>
      
      <button
        onClick={handleAssemble}
        disabled={assembling}
        className="btn-primary"
        style={{ background: '#10b981' }}
      >
        {assembling ? 'Assembling...' : 'Assemble Video'}
      </button>
      
      {outputPath && (
        <p className="mt-3 text-sm text-gray-400 break-all">
          Output: {outputPath}
        </p>
      )}
    </div>
  );
};

export default ExportPanel;