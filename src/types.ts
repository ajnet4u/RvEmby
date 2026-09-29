export interface SubtitleTrack {
  id: string;
  index?: number;
  lang: string;
  code?: string;
  label: string;
  format?: string;
  url?: string;
  isDefault?: boolean;
  isText?: boolean;
}

export interface AudioTrackInfo {
  lang: string;
  format: string;
  codec?: string;
  index?: number;
  channels?: number;
  isDefault?: boolean;
}

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
  mediaSourceId?: string;
  rating?: number;
  contentRating?: string;
  director?: string;
  cast?: string[];
  resolutionBadge?: string;
  hdrBadge?: string;
  audioTracks?: AudioTrackInfo[];
  subtitles?: string[];
  subtitleTracks?: SubtitleTrack[];
  playbackPositionSeconds?: number;
  playbackPercentage?: number;
  lastWatchedAt?: number;
}

export interface ServerSettings {
  url: string;
  apiKey: string;
  serverType?: 'emby' | 'jellyfin';
}

export type SortField = 'title' | 'year' | 'rating' | 'default';
export type SortDirection = 'asc' | 'desc';
