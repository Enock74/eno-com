import React, { useEffect, useState } from 'react';
import { getStyle, updateStyle } from '../services/api';

interface Style {
  font: string;
  font_size: number;
  font_color: string;
  background_color: string;
  position: string;
  animation: string;
  use_keyframes?: boolean;
}

interface StylePanelProps {
  videoId: number;
}

const StylePanel: React.FC<StylePanelProps> = ({ videoId }) => {
  const [style, setStyle] = useState<Style | null>(null);
  const [loading, setLoading] = useState(true);
  const [useKeyframes, setUseKeyframes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStyle = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getStyle(videoId);
        console.log('Style data received:', res.data);
        setStyle(res.data);
        setUseKeyframes(res.data?.use_keyframes || false);
      } catch (err) {
        console.error('Failed to fetch style', err);
        setError('Could not load style. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchStyle();
  }, [videoId]);

  const handleChange = (field: keyof Style, value: string | number) => {
    if (!style) return;
    setStyle({ ...style, [field]: value });
  };

  const handleSave = async () => {
    if (!style) return;
    try {
      await updateStyle(videoId, { ...style, use_keyframes: useKeyframes });
      alert('Style saved successfully!');
    } catch (err) {
      console.error('Save failed', err);
      alert('Failed to save style');
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h2 className="card-title">Caption Style</h2>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading style...</div>
      </div>
    );
  }

  if (error || !style) {
    return (
      <div className="card">
        <h2 className="card-title">Caption Style</h2>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
          {error || 'No style data available. Upload a new video to create default style.'}
        </div>
      </div>
    );
  }

  const animationPresets = [
    { value: 'fade', label: 'Fade In/Out', preview: '↕️ Smooth fade' },
    { value: 'slide-up', label: 'Slide Up', preview: '⬆️ Slides from bottom' },
    { value: 'bounce', label: 'Bounce', preview: '🏀 Bouncy effect' },
    { value: 'zoom-in', label: 'Zoom In', preview: '🔍 Zooms into view' }
  ];

  return (
    <div className="card">
      <h2 className="card-title">Caption Style</h2>
      <div className="grid-2">
        <div>
          <label>Font</label>
          <input 
            type="text" 
            value={style.font} 
            onChange={(e) => handleChange('font', e.target.value)} 
            placeholder="Arial"
          />
        </div>
        
        <div>
          <label>Size (px)</label>
          <input 
            type="number" 
            value={style.font_size} 
            onChange={(e) => handleChange('font_size', parseInt(e.target.value))} 
            min="8"
            max="72"
          />
        </div>
        
        <div>
          <label>Font Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="color" 
              value={style.font_color} 
              onChange={(e) => handleChange('font_color', e.target.value)} 
              style={{ width: '3rem', height: '2rem', cursor: 'pointer' }} 
            />
            <span style={{ fontFamily: 'monospace' }}>{style.font_color}</span>
          </div>
        </div>
        
        <div>
          <label>Background Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="color" 
              value={style.background_color} 
              onChange={(e) => handleChange('background_color', e.target.value)} 
              style={{ width: '3rem', height: '2rem', cursor: 'pointer' }} 
            />
            <span style={{ fontFamily: 'monospace' }}>{style.background_color}</span>
          </div>
        </div>
        
        <div>
          <label>Position</label>
          <select value={style.position} onChange={(e) => handleChange('position', e.target.value)}>
            <option value="bottom">Bottom</option>
            <option value="top">Top</option>
            <option value="center">Center</option>
          </select>
        </div>
        
        <div>
          <label>Animation Preset</label>
          <select value={style.animation} onChange={(e) => handleChange('animation', e.target.value)}>
            {animationPresets.map(preset => (
              <option key={preset.value} value={preset.value}>{preset.label}</option>
            ))}
          </select>
          <small style={{ display: 'block', marginTop: '0.25rem', color: '#6b7280' }}>
            {animationPresets.find(p => p.value === style.animation)?.preview}
          </small>
        </div>
        
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={useKeyframes}
              onChange={(e) => setUseKeyframes(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Enable keyframe animations (move/scale over time)
          </label>
          <small style={{ display: 'block', marginTop: '0.25rem', color: '#6b7280' }}>
            Text will move across the screen during the caption duration
          </small>
        </div>
      </div>
      
      <button 
        onClick={handleSave} 
        className="btn-primary" 
        style={{ marginTop: '1.5rem', width: '100%' }}
      >
        Save Style
      </button>
    </div>
  );
};

export default StylePanel;