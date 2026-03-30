export interface Caption {
  id: number;
  video_id: number;
  start_time: number;
  end_time: number;
  text: string;
}

export interface Style {
  font: string;
  font_size: number;
  font_color: string;
  background_color: string;
  position: string;
  animation: string;
}