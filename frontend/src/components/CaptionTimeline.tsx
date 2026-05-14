import React, { useEffect, useState, useCallback } from 'react';
import { Caption } from '../types';
import { getCaptions, updateCaption, splitCaption, mergeCaptions, deleteCaption } from '../services/api';
import { getAudioStreamUrl } from '../services/api';
import VisualTimeline from './VisualTimeline';
import AudioWaveform from './AudioWaveform';

interface CaptionTimelineProps {
  videoId: number;
}

const CaptionTimeline: React.FC<CaptionTimelineProps> = ({ videoId }) => {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [videoDuration, setVideoDuration] = useState(300); // default 5 min, will update from captions
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const fetchCaptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCaptions(videoId);
      setCaptions(res.data);
      if (res.data.length > 0) {
        // Set duration to the end time of the last caption
        setVideoDuration(res.data[res.data.length - 1].end_time);
      }
    } catch (err) {
      console.error('Failed to fetch captions', err);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    fetchCaptions();
  }, [fetchCaptions]);

  // Set audio URL for waveform
  useEffect(() => {
    if (videoId) {
      setAudioUrl(getAudioStreamUrl(videoId));
    }
  }, [videoId]);

  const handleUpdate = async (id: number) => {
    if (!editText.trim()) return;
    try {
      await updateCaption(id, { text: editText });
      setEditingId(null);
      fetchCaptions();
    } catch (err) {
      console.error('Update failed', err);
    }
  };

  const handleSplit = async (id: number, start: number, end: number) => {
    const splitTime = (start + end) / 2;
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Split at ${splitTime.toFixed(2)}s?`)) return;
    try {
      await splitCaption(id, splitTime);
      fetchCaptions();
    } catch (err) {
      console.error('Split failed', err);
    }
  };

  const handleMerge = async (id1: number, id2: number) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Merge these two captions?')) return;
    try {
      await mergeCaptions(id1, id2);
      fetchCaptions();
    } catch (err) {
      console.error('Merge failed', err);
    }
  };

  const handleDelete = async (id: number) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Delete this caption?')) return;
    try {
      await deleteCaption(id);
      fetchCaptions();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleCaptionResize = async (captionId: number, newStart: number, newEnd: number) => {
    try {
      await updateCaption(captionId, { start_time: newStart, end_time: newEnd });
      fetchCaptions();
    } catch (err) {
      console.error('Resize failed', err);
    }
  };

  const handleCaptionDrag = async (captionId: number, newStart: number) => {
    try {
      const cap = captions.find(c => c.id === captionId);
      if (cap) {
        const duration = cap.end_time - cap.start_time;
        await updateCaption(captionId, { start_time: newStart, end_time: newStart + duration });
        fetchCaptions();
      }
    } catch (err) {
      console.error('Drag failed', err);
    }
  };

  const handleCaptionClick = (caption: Caption) => {
    setEditingId(caption.id);
    setEditText(caption.text);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading captions...</div>;

  return (
    <div className="card">
      <h2 className="card-title">Caption Timeline</h2>
      
      {/* Visual Timeline */}
      {captions.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <VisualTimeline
            captions={captions}
            videoDuration={videoDuration}
            onCaptionClick={handleCaptionClick}
            onCaptionResize={handleCaptionResize}
            onCaptionDrag={handleCaptionDrag}
          />
        </div>
      )}
      
      {/* Audio Waveform */}
      {audioUrl && (
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">Audio Waveform</label>
          <AudioWaveform 
            audioUrl={audioUrl} 
            onSeek={(time) => console.log('Seek to', time)} 
          />
        </div>
      )}
      
      {/* Existing list view */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {captions.map((cap, idx) => (
          <div key={cap.id} className="caption-item">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="caption-time">{cap.start_time.toFixed(2)}s → {cap.end_time.toFixed(2)}s</div>
              {editingId === cap.id ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} style={{ flex: 1 }} />
                  <button onClick={() => handleUpdate(cap.id)} className="btn-success" style={{ padding: '0.25rem 0.75rem' }}>Save</button>
                  <button onClick={() => setEditingId(null)} className="btn-danger" style={{ padding: '0.25rem 0.75rem' }}>Cancel</button>
                </div>
              ) : (
                <>
                  <div className="caption-text">{cap.text}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button onClick={() => { setEditingId(cap.id); setEditText(cap.text); }} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '1.2rem' }} title="Edit">✏️</button>
                    <button onClick={() => handleSplit(cap.id, cap.start_time, cap.end_time)} style={{ background: 'none', border: 'none', color: '#facc15', cursor: 'pointer', fontSize: '1.2rem' }} title="Split">✂️</button>
                    {idx > 0 && (
                      <button onClick={() => handleMerge(captions[idx-1].id, cap.id)} style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer', fontSize: '1.2rem' }} title="Merge">🔗</button>
                    )}
                    <button onClick={() => handleDelete(cap.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }} title="Delete">🗑️</button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CaptionTimeline;