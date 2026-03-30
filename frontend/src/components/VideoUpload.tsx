import React, { useState } from 'react';
import { uploadVideo } from '../services/api';

interface VideoUploadProps {
  onUploadSuccess: (videoId: number) => void;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [videoId, setVideoId] = useState<number | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadVideo(file);
      const id = res.data.video_id;
      setVideoId(id);
      onUploadSuccess(id);
      alert(`Upload successful! Video ID: ${id}`);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">Upload Video</h2>
      <div className="flex-row">
        <label style={{ flex: 1, textAlign: 'center', cursor: 'pointer', background: '#1f2937', padding: '0.5rem', borderRadius: '0.5rem' }}>
          <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
          <span>{file ? file.name : 'Choose a video file'}</span>
        </label>
        <button onClick={handleUpload} disabled={!file || uploading} className="btn-primary">
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
      {videoId && <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#9ca3af' }}>Video ID: {videoId}</p>}
    </div>
  );
};

export default VideoUpload;