import React, { useState } from 'react';
import { assembleVideo } from '../services/api';

interface ExportPanelProps {
  videoId: number;
}

const transitionTypes = [
  { value: 'fade', label: 'Fade', preview: '↕️ Smooth fade' },
  { value: 'dissolve', label: 'Dissolve', preview: '🌀 Cross dissolve' },
  { value: 'wipe', label: 'Wipe', preview: '➡️ Wipe left' },
  { value: 'slide', label: 'Slide', preview: '↪️ Slide in' },
  { value: 'zoom', label: 'Zoom', preview: '🔍 Zoom transition' }
];

const ExportPanel: React.FC<ExportPanelProps> = ({ videoId }) => {
  const [assembling, setAssembling] = useState(false);
  const [outputPath, setOutputPath] = useState('');
  const [resolution, setResolution] = useState('1080p');
  const [quality, setQuality] = useState('medium');
  const [format, setFormat] = useState('mp4');
  const [useTransition, setUseTransition] = useState(false);
  const [transitionType, setTransitionType] = useState('fade');
  const [bitrate, setBitrate] = useState(2.5);
  const [previewTransition, setPreviewTransition] = useState<string | null>(null);

  const handleAssemble = async () => {
    setAssembling(true);
    try {
      const res = await assembleVideo(videoId, { 
        resolution, quality, format, 
        transition: useTransition, 
        transition_type: transitionType,
        bitrate 
      });
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

  const previewTransitionEffect = (type: string) => {
    setPreviewTransition(type);
    setTimeout(() => setPreviewTransition(null), 2000);
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
        
        <div>
          <label>Bitrate (Mbps): {bitrate}</label>
          <input 
            type="range" 
            min="0.5" 
            max="10" 
            step="0.5"
            value={bitrate}
            onChange={(e) => setBitrate(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af' }}>
            <span>Low (0.5)</span>
            <span>Medium (2.5)</span>
            <span>High (10)</span>
          </div>
        </div>
      </div>
      
      {/* Transitions Section */}
      <div className="mb-4">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="checkbox"
            checked={useTransition}
            onChange={(e) => setUseTransition(e.target.checked)}
          />
          Enable transitions between clips
        </label>
        
        {useTransition && (
          <div>
            <label>Transition Type</label>
            <div className="grid-2">
              {transitionTypes.map(trans => (
                <div key={trans.value} style={{ marginBottom: '0.5rem' }}>
                  <button
                    onClick={() => {
                      setTransitionType(trans.value);
                      previewTransitionEffect(trans.value);
                    }}
                    className={`btn-primary ${transitionType === trans.value ? 'bg-blue-600' : 'bg-gray-600'}`}
                    style={{ 
                      padding: '0.5rem', 
                      width: '100%',
                      background: transitionType === trans.value ? '#2563eb' : '#4b5563'
                    }}
                  >
                    {trans.label}
                  </button>
                  <small style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af', textAlign: 'center' }}>
                    {trans.preview}
                  </small>
                </div>
              ))}
            </div>
            
            {/* Transition Preview Animation */}
            {previewTransition && (
              <div className="transition-preview" style={{
                marginTop: '1rem',
                padding: '1rem',
                background: '#1e293b',
                borderRadius: '8px',
                textAlign: 'center',
                animation: 'pulse 0.5s ease'
              }}>
                <span style={{ fontSize: '2rem' }}>
                  {previewTransition === 'fade' && '🌅'}
                  {previewTransition === 'dissolve' && '🌀'}
                  {previewTransition === 'wipe' && '➡️'}
                  {previewTransition === 'slide' && '↪️'}
                  {previewTransition === 'zoom' && '🔍'}
                </span>
                <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                  Preview: {transitionTypes.find(t => t.value === previewTransition)?.label} transition
                </p>
              </div>
            )}
          </div>
        )}
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