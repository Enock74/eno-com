import React, { useEffect, useState } from 'react';
import { Style } from '../types';
import { getStyle, updateStyle } from '../services/api';

interface StylePanelProps {
  videoId: number;
}

const StylePanel: React.FC<StylePanelProps> = ({ videoId }) => {
  const [style, setStyle] = useState<Style | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStyle = async () => {
      try {
        const res = await getStyle(videoId);
        setStyle(res.data);
      } catch (err) {
        console.error('Failed to fetch style', err);
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
      await updateStyle(videoId, style);
      alert('Style saved!');
    } catch (err) {
      console.error('Save failed', err);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading style...</div>;
  if (!style) return <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No style data</div>;

  return (
    <div className="card">
      <h2 className="card-title">Caption Style</h2>
      <div className="grid-2">
        <div>
          <label>Font</label>
          <input type="text" value={style.font} onChange={(e) => handleChange('font', e.target.value)} />
        </div>
        <div>
          <label>Size (px)</label>
          <input type="number" value={style.font_size} onChange={(e) => handleChange('font_size', parseInt(e.target.value))} />
        </div>
        <div>
          <label>Font Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="color" value={style.font_color} onChange={(e) => handleChange('font_color', e.target.value)} style={{ width: '3rem', height: '2rem' }} />
            <span>{style.font_color}</span>
          </div>
        </div>
        <div>
          <label>Background Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="color" value={style.background_color} onChange={(e) => handleChange('background_color', e.target.value)} style={{ width: '3rem', height: '2rem' }} />
            <span>{style.background_color}</span>
          </div>
        </div>
        <div>
          <label>Position</label>
          <select value={style.position} onChange={(e) => handleChange('position', e.target.value)}>
            <option>bottom</option><option>top</option><option>center</option>
          </select>
        </div>
        <div>
          <label>Animation</label>
          <select value={style.animation} onChange={(e) => handleChange('animation', e.target.value)}>
            <option>fade</option><option>slide</option><option>bounce</option><option>pop</option>
          </select>
        </div>
      </div>
      <button onClick={handleSave} className="btn-primary" style={{ marginTop: '1.5rem' }}>Save Style</button>
    </div>
  );
};

export default StylePanel;