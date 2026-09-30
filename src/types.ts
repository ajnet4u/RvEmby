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
  seriesId?: string;
  seriesName?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  creditsStartTime?: number; // timestamp in seconds where credits begin
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

export interface TvShow {
  id: string;
  title: string;
  year?: number;
  overview?: string;
  poster?: string | null;
  backdrop?: string | null;
  rating?: number;
  contentRating?: string;
  genres?: string[];
  status?: string;
  seasonsCount?: number;
  episodesCount?: number;
  cast?: string[];
  seasons?: Season[];
}

export interface Season {
  id: string;
  seriesId: string;
  seriesName?: string;
  name: string;
  seasonNumber: number;
  poster?: string | null;
  episodesCount?: number;
  episodes?: Episode[];
}

export interface Episode {
  id: string;
  seriesId: string;
  seriesName: string;
  seasonId: string;
  seasonName: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  overview?: string;
  runtime?: number; // in minutes
  thumb?: string | null;
  videoUrl?: string;
  mediaSourceId?: string;
  rating?: number;
  resolutionBadge?: string;
  hdrBadge?: string;
  audioTracks?: AudioTrackInfo[];
  subtitles?: string[];
  subtitleTracks?: SubtitleTrack[];
  creditsStartTime?: number; // timestamp in seconds where credits begin
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
