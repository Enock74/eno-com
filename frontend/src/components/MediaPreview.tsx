import React, { useState, useEffect } from 'react';

interface MediaItem {
  id: number;
  title: string;
  thumbnail: string;
  url: string;
  duration?: number;
}

interface MediaPreviewProps {
  captionText: string;
  onSelect: (url: string) => void;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({ captionText, onSelect }) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mediaType, setMediaType] = useState<'video' | 'photo'>('video');

  const fetchMedia = async () => {
    if (!captionText.trim()) return;
    setLoading(true);
    try {
      // Use relative URL (proxy will handle it)
      const response = await fetch(`/clips/search?q=${encodeURIComponent(captionText)}&media_type=${mediaType}`);
      const data = await response.json();
      setMedia(data.results || []);
    } catch (err) {
      console.error('Failed to fetch media', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showModal) {
      fetchMedia();
    }
  }, [showModal, mediaType]);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-xs text-blue-400 hover:text-blue-300 ml-2"
        title="Preview stock media"
      >
        🖼️
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-4 max-w-3xl w-full max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Stock Media: "{captionText.substring(0, 50)}"</h3>
              <button onClick={() => setShowModal(false)} className="text-red-400 hover:text-red-300 text-xl">✕</button>
            </div>
            
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMediaType('video')}
                className={`px-3 py-1 rounded ${mediaType === 'video' ? 'bg-blue-600' : 'bg-gray-600'}`}
              >
                Videos
              </button>
              <button
                onClick={() => setMediaType('photo')}
                className={`px-3 py-1 rounded ${mediaType === 'photo' ? 'bg-blue-600' : 'bg-gray-600'}`}
              >
                Images
              </button>
            </div>
            
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : media.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No results found. Try different keywords.</div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {media.map((item) => (
                  <div
                    key={item.id}
                    className="cursor-pointer hover:opacity-75 transition bg-gray-700 rounded-lg overflow-hidden"
                    onClick={() => {
                      onSelect(item.url);
                      setShowModal(false);
                    }}
                  >
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-2 text-xs truncate">
                      {item.title}
                      {item.duration && <span className="text-gray-400 ml-1">({item.duration}s)</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MediaPreview;