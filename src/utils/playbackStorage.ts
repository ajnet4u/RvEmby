import { Movie } from '../types';

export interface PlaybackProgress {
  movieId: string;
  positionSeconds: number;
  durationSeconds: number;
  percentage: number;
  updatedAt: number;
}

const STORAGE_KEY = 'jemby_playback_progress';

/**
 * Loads all locally saved playback progress records.
 */
export function getSavedPlaybackProgress(): Record<string, PlaybackProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('rvemby_playback_progress');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to read saved playback progress:", e);
  }
  return {};
}

/**
 * Saves playback progress for a given movie.
 * Automatically clears when movie is watched to >= 95% or < 10 seconds.
 */
export function savePlaybackProgress(movieId: string, positionSeconds: number, durationSeconds: number): void {
  if (!movieId || durationSeconds <= 0) return;

  const percentage = Math.min(100, Math.max(0, (positionSeconds / durationSeconds) * 100));
  const current = getSavedPlaybackProgress();

  // If watched past 95% or within last 30s, treat as completed and remove from continue watching
  if (percentage >= 95 || (durationSeconds - positionSeconds) <= 25) {
    delete current[movieId];
  } else if (positionSeconds > 10) {
    // Only save if watched past initial 10 seconds
    current[movieId] = {
      movieId,
      positionSeconds: Math.floor(positionSeconds),
      durationSeconds: Math.floor(durationSeconds),
      percentage: Math.round(percentage),
      updatedAt: Date.now()
    };
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("Failed to save playback progress:", e);
  }
}

/**
 * Explicitly removes an item from Continue Watching.
 */
export function removePlaybackProgress(movieId: string): void {
  const current = getSavedPlaybackProgress();
  if (current[movieId]) {
    delete current[movieId];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) {}
  }
}

/**
 * Merges a list of movies with local playback progress.
 */
export function attachLocalProgressToMovies(movies: Movie[]): Movie[] {
  const progressMap = getSavedPlaybackProgress();
  return movies.map(movie => {
    const local = progressMap[movie.id];
    if (local && (!movie.playbackPositionSeconds || local.updatedAt > (movie.lastWatchedAt || 0))) {
      return {
        ...movie,
        playbackPositionSeconds: local.positionSeconds,
        playbackPercentage: local.percentage,
        lastWatchedAt: local.updatedAt
      };
    }
    return movie;
  });
}
