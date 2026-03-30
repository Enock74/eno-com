import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export const uploadVideo = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/videos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Captions
export const getCaptions = (videoId: number) => api.get(`/captions/${videoId}`);
export const updateCaption = (captionId: number, data: { text?: string; start_time?: number; end_time?: number }) =>
  api.put(`/captions/${captionId}`, data);
export const splitCaption = (captionId: number, splitTime: number) =>
  api.post(`/captions/${captionId}/split`, { split_time: splitTime });
export const mergeCaptions = (captionId1: number, captionId2: number) =>
  api.post('/captions/merge', { caption_id1: captionId1, caption_id2: captionId2 });
export const deleteCaption = (captionId: number) => api.delete(`/captions/${captionId}`);

// Styles
export const getStyle = (videoId: number) => api.get(`/styles/${videoId}`);
export const updateStyle = (videoId: number, style: any) => api.post(`/styles/${videoId}`, style);

// Assembly
export const assembleVideo = (videoId: number) => api.post(`/assembly/${videoId}`);