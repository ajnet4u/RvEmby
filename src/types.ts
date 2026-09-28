export interface Movie {
  id: string;
  title: string;
  year?: number;
  overview?: string;
  runtime?: number; // in minutes
  genres?: string[];
  poster?: string | null;
  backdrop?: string | null;
  videoUrl?: string; // Direct stream URL if available
  rating?: number;
  contentRating?: string;
  director?: string;
  cast?: string[];
  resolutionBadge?: string;
  hdrBadge?: string;
  audioTracks?: { lang: string; format: string }[];
  subtitles?: string[];
}

export interface ServerSettings {
  url: string;
  apiKey: string;
  serverType?: 'emby' | 'jellyfin';
}
