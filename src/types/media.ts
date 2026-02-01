export interface AudioFormatOption {
  formatId: string;
  ext?: string;
  abr?: number;
  formatNote?: string;
  filesize?: number;
  label?: string;
}

export interface MediaMetadata {
  type: "video" | "audio" | "photo" | "playlist";
  title: string;
  thumbnail?: string;
  duration?: string;
  author?: string;
  description?: string;
  platform: "youtube" | "facebook" | "instagram" | "twitter" | "linkedin";
  sourceUrl?: string;
  audioFormats?: AudioFormatOption[];
}

export interface PlaylistItem {
  id: string;
  title: string;
  thumbnail?: string;
  duration?: string;
  url: string;
  selected: boolean;
}

export interface PlaylistMetadata extends MediaMetadata {
  type: "playlist";
  items: PlaylistItem[];
  totalItems: number;
}

export interface PreviewData {
  loading: boolean;
  error?: string;
  metadata?: MediaMetadata | PlaylistMetadata;
}
