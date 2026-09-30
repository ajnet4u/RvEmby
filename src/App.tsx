/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Movie, TvShow, Episode, ServerSettings, SortField, SortDirection } from './types';
import { MOCK_MOVIES, MOCK_TV_SHOWS, getMockEpisodesForSeries } from './mockData';
import { fetchEmbyMovies, fetchEmbyTvShows, fetchEmbyResumeItems, reportPlaybackProgress, episodeToPlayableMovie } from './api/emby';
import { Sidebar, NavTab } from './components/Sidebar';
import { MovieGrid } from './components/MovieGrid';
import { MovieDetails } from './components/MovieDetails';
import { TvShowGrid } from './components/TvShowGrid';
import { TvShowDetails } from './components/TvShowDetails';
import { VideoPlayer } from './components/VideoPlayer';
import { ContinueWatchingRow } from './components/ContinueWatchingRow';
import { CodecDiagnosticsPage } from './components/CodecDiagnosticsPage';
import { SettingsModal } from './components/SettingsModal';
import { TvRemoteOverlay } from './components/TvRemoteOverlay';
import { useTvNavigation } from './hooks/useTvNavigation';
import { 
  getSavedPlaybackProgress, 
  savePlaybackProgress, 
  removePlaybackProgress, 
  attachLocalProgressToMovies 
} from './utils/playbackStorage';
import { AnimatePresence, motion } from 'motion/react';
import { Star, EyeOff, Server, AlertCircle, Loader2, Search, X, Play } from 'lucide-react';

const STORAGE_KEY = 'jemby_server_settings';
const FAVORITES_KEY = 'jemby_favorites';
const DISMISSED_KEY = 'jemby_has_dismissed_setup';

export default function App() {
  // Load saved settings from URL params (Quick-Connect), localStorage, or environment variables
  const [settings, setSettings] = useState<ServerSettings>(() => {
    // 1. Check URL parameters for Quick-Connect / Sync Link (e.g. ?server=...&key=...)
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const qUrl = params.get('server') || params.get('url') || params.get('emby_url');
        const qKey = params.get('key') || params.get('apiKey') || params.get('emby_key');
        if (qKey) {
          const quickSettings: ServerSettings = {
            url: (qUrl || 'http://192.168.10.146:8096').trim(),
            apiKey: qKey.trim()
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(quickSettings));
          localStorage.setItem(DISMISSED_KEY, 'true');
          // Clean the sensitive key from the address bar without reloading
          window.history.replaceState({}, document.title, window.location.pathname);
          return quickSettings;
        }
      }
    } catch (e) {}

    // 2. Check localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('rvemby_server_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.apiKey) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse saved settings:", e);
    }

    // 3. Check environment variables if provided in Docker
    const envUrl = (import.meta as any).env?.VITE_EMBY_URL;
    const envKey = (import.meta as any).env?.VITE_EMBY_API_KEY;
    if (envKey) {
      return { url: envUrl || 'http://192.168.10.146:8096', apiKey: envKey };
    }
    return { url: 'http://192.168.10.146:8096', apiKey: '' };
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY) || localStorage.getItem('rvemby_favorites');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [movies, setMovies] = useState<Movie[]>(MOCK_MOVIES);
  const [tvShows, setTvShows] = useState<TvShow[]>(MOCK_TV_SHOWS);
  const [continueWatching, setContinueWatching] = useState<Movie[]>(() => {
    // Initial load: seed realistic in-progress items from demo movies
    return [
      {
        ...MOCK_MOVIES[0],
        playbackPositionSeconds: 5220,
        playbackPercentage: 60
      },
      {
        ...MOCK_MOVIES[1],
        playbackPositionSeconds: 2280,
        playbackPercentage: 34
      }
    ];
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  // Search query state for real-time title filtering
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting state: Title (A-Z), Release Date (Newest/Oldest), Rating (Highest/Lowest)
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedTvShow, setSelectedTvShow] = useState<TvShow | null>(null);
  const [playingMovie, setPlayingMovie] = useState<Movie | null>(null);
  const [resumeTime, setResumeTime] = useState<number>(0);
  const [hoveredMovie, setHoveredMovie] = useState<Movie | null>(null);
  const [hoveredTvShow, setHoveredTvShow] = useState<TvShow | null>(null);

  // Never automatically force-open the setup dialog on new devices!
  // App opens in clean Demo / Cinema mode; user can click "Connect Emby" whenever ready.
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch (e) {}
  };

  // Sync with server shared configuration (/api/settings)
  // Enables any new device on the network (TV, tablet, mobile) to automatically inherit the saved Emby credentials!
  useEffect(() => {
    async function loadServerConfig() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const serverConfig = await res.json();
          if (serverConfig && serverConfig.apiKey) {
            setSettings(prev => {
              if (!prev.apiKey || prev.apiKey !== serverConfig.apiKey) {
                const merged: ServerSettings = {
                  url: serverConfig.url || prev.url || 'http://192.168.10.146:8096',
                  apiKey: serverConfig.apiKey
                };
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                  localStorage.setItem(DISMISSED_KEY, 'true');
                } catch (e) {}
                return merged;
              }
              return prev;
            });
          }
        }
      } catch (e) {
        // Silent fallback for static environments
      }
    }

    loadServerConfig();
  }, []);

  // Fetch movies, TV shows, and incomplete playback (Continue Watching) data whenever settings change
  useEffect(() => {
    async function loadMovies() {
      if (settings.url && settings.apiKey) {
        setLoading(true);
        setError(null);
        try {
          // Parallel fetch: Movies, TV Series & Incomplete playback (Resume) items
          const [embyMovies, embyShows, resumeItems] = await Promise.all([
            fetchEmbyMovies(settings),
            fetchEmbyTvShows(settings),
            fetchEmbyResumeItems(settings)
          ]);

          if (embyMovies.length > 0) {
            const moviesWithProgress = attachLocalProgressToMovies(embyMovies);
            setMovies(moviesWithProgress);
            setIsConnected(true);
            setError(null);

            // Merge Emby server resume items with any local in-progress entries
            if (resumeItems.length > 0) {
              setContinueWatching(resumeItems);
            } else {
              const localProgressMap = getSavedPlaybackProgress();
              const localResume = moviesWithProgress
                .filter(m => localProgressMap[m.id] && localProgressMap[m.id].positionSeconds > 10)
                .sort((a, b) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0));
              setContinueWatching(localResume);
            }
          } else {
            setError("Connected to Emby, but no movies were found.");
            setIsConnected(true);
          }

          if (embyShows && embyShows.length > 0) {
            setTvShows(embyShows);
          } else {
            setTvShows(MOCK_TV_SHOWS);
          }
        } catch (err: any) {
          console.error("Failed to fetch Emby library:", err);
          setError(err.message || "Failed to reach Emby. Showing demo data.");
          setMovies(attachLocalProgressToMovies(MOCK_MOVIES));
          setTvShows(MOCK_TV_SHOWS);
          setIsConnected(false);
        } finally {
          setLoading(false);
        }
      } else {
        const demoMoviesWithProgress = attachLocalProgressToMovies(MOCK_MOVIES);
        setMovies(demoMoviesWithProgress);
        setTvShows(MOCK_TV_SHOWS);
        setIsConnected(false);

        // Check local progress or provide demo continue watching
        const localProgressMap = getSavedPlaybackProgress();
        const localResume = demoMoviesWithProgress
          .filter(m => localProgressMap[m.id] && localProgressMap[m.id].positionSeconds > 10)
          .sort((a, b) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0));

        if (localResume.length > 0) {
          setContinueWatching(localResume);
        } else {
          setContinueWatching([
            {
              ...MOCK_MOVIES[0],
              playbackPositionSeconds: 5220,
              playbackPercentage: 60
            },
            {
              ...MOCK_MOVIES[1],
              playbackPositionSeconds: 2280,
              playbackPercentage: 34
            }
          ]);
        }
      }
    }
    loadMovies();
  }, [settings.url, settings.apiKey]);

  // Handle Playback progress updates from VideoPlayer
  const handleProgressUpdate = useCallback((movieId: string, positionSeconds: number, durationSeconds: number) => {
    savePlaybackProgress(movieId, positionSeconds, durationSeconds);
    
    // Report to Emby server
    if (isConnected && settings.url && settings.apiKey) {
      reportPlaybackProgress(settings, movieId, positionSeconds, false);
    }

    const percentage = Math.min(100, Math.round((positionSeconds / durationSeconds) * 100));

    // If finished, remove from continue watching
    if (percentage >= 95 || (durationSeconds - positionSeconds) <= 25) {
      setContinueWatching(prev => prev.filter(m => m.id !== movieId));
      setMovies(prev => prev.map(m => m.id === movieId ? { ...m, playbackPositionSeconds: undefined, playbackPercentage: undefined } : m));
    } else if (positionSeconds > 10) {
      setContinueWatching(prev => {
        const existing = prev.find(m => m.id === movieId);
        if (!existing) return prev;

        const updated: Movie = {
          ...existing,
          playbackPositionSeconds: Math.floor(positionSeconds),
          playbackPercentage: percentage,
          lastWatchedAt: Date.now()
        };
        const rest = prev.filter(m => m.id !== movieId);
        return [updated, ...rest];
      });

      setMovies(prev => prev.map(m => m.id === movieId ? { ...m, playbackPositionSeconds: Math.floor(positionSeconds), playbackPercentage: percentage } : m));
    }
  }, [isConnected, settings.url, settings.apiKey]);

  // Dismiss an item from Continue Watching
  const handleDismissContinueWatching = useCallback((movieId: string) => {
    removePlaybackProgress(movieId);
    setContinueWatching(prev => prev.filter(m => m.id !== movieId));
    setMovies(prev => prev.map(m => m.id === movieId ? { ...m, playbackPositionSeconds: undefined, playbackPercentage: undefined } : m));
  }, []);

  // Launch playback directly with optional resume position
  const handlePlayMovie = useCallback((movie: Movie, startSeconds?: number) => {
    setPlayingMovie(movie);
    setResumeTime(startSeconds || 0);
    setSelectedMovie(null);
    setSelectedTvShow(null);
  }, []);

  // Launch TV Episode playback
  const handlePlayEpisode = useCallback((episode: Episode) => {
    const playableMovie = episodeToPlayableMovie(episode);
    handlePlayMovie(playableMovie, episode.playbackPositionSeconds || 0);
    setSelectedTvShow(null);
  }, [handlePlayMovie]);

  // Compute next video item for post-credits "Up Next" sequence
  const nextPlayableMovie = useMemo<Movie | null>(() => {
    if (!playingMovie) return null;

    // 1. If currently playing a TV Show episode: resolve the next episode
    if (playingMovie.seriesId) {
      const show = tvShows.find(s => s.id === playingMovie.seriesId);
      if (show) {
        const curSeason = playingMovie.seasonNumber || 1;
        const curEpisode = playingMovie.episodeNumber || 1;

        // Try next episode in current season
        const currentSeasonEps = getMockEpisodesForSeries(show.id, curSeason);
        const nextEp = currentSeasonEps.find(e => e.episodeNumber === curEpisode + 1);
        if (nextEp) {
          return episodeToPlayableMovie(nextEp);
        }

        // Try episode 1 of next season
        const nextSeasonEps = getMockEpisodesForSeries(show.id, curSeason + 1);
        if (nextSeasonEps.length > 0) {
          return episodeToPlayableMovie(nextSeasonEps[0]);
        }
      }
    }

    // 2. If playing a standalone movie: find the next movie in the collection
    const currentIndex = movies.findIndex(m => m.id === playingMovie.id);
    if (currentIndex !== -1 && movies.length > 1) {
      return movies[(currentIndex + 1) % movies.length];
    }

    // 3. Fallback to another movie from mock library
    const fallback = MOCK_MOVIES.find(m => m.id !== playingMovie.id) || MOCK_MOVIES[0];
    return fallback;
  }, [playingMovie, tvShows, movies]);

  // Living Room / TV Remote / Gamepad spatial navigation handler
  const handleBackAction = useCallback(() => {
    if (playingMovie) {
      setPlayingMovie(null);
      return true;
    }
    if (selectedTvShow) {
      setSelectedTvShow(null);
      return true;
    }
    if (selectedMovie) {
      setSelectedMovie(null);
      return true;
    }
    if (isSettingsOpen) {
      handleCloseSettings();
      return true;
    }
    if (searchQuery) {
      setSearchQuery('');
      return true;
    }
    if (selectedGenre) {
      setSelectedGenre(null);
      return true;
    }
    if (activeTab !== 'home') {
      setActiveTab('home');
      return true;
    }
    return false;
  }, [playingMovie, selectedTvShow, selectedMovie, isSettingsOpen, searchQuery, selectedGenre, activeTab]);

  const { isTvMode } = useTvNavigation({
    onBack: handleBackAction
  });

  // Handle saving settings to state, localStorage & server backend
  const handleSaveSettings = async (newSettings: ServerSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch (e) {
      console.error("Failed to save settings:", e);
    }

    // Persist to server backend so any new device connecting gets it automatically
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
    } catch (e) {
      // Ignore on static deployments
    }
  };

  // Toggle favorite movie
  const toggleFavorite = (movieId: string) => {
    setFavorites(prev => {
      const next = prev.includes(movieId) ? prev.filter(id => id !== movieId) : [...prev, movieId];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Filter & sort movies based on current active tab, search query, and sort parameters
  const displayedMovies = useMemo(() => {
    let result = [...movies];

    if (activeTab === 'home' && !searchQuery.trim()) {
      // Instead of featured movies, display continue watching.
      // Only if continue watching is empty, display featured movies.
      if (continueWatching.length > 0) {
        result = [...continueWatching];
        // For continue watching recency order, preserve it unless user actively chose a custom sort
        if (sortField === 'title' || sortField === 'default') {
          return result;
        }
      } else {
        result = [...movies];
      }
    } else if (activeTab === 'favorites') {
      result = result.filter(m => favorites.includes(m.id));
    } else if (activeTab === 'collections') {
      if (selectedGenre) {
        result = result.filter(m => m.genres && m.genres.includes(selectedGenre));
      }
    }

    // Real-time title search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(m => (m.title || '').toLowerCase().includes(q));
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'title') {
        const titleA = (a.title || '').trim().toLowerCase();
        const titleB = (b.title || '').trim().toLowerCase();
        comparison = titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'year') {
        const yearA = a.year || 0;
        const yearB = b.year || 0;
        comparison = yearA - yearB;
      } else if (sortField === 'rating') {
        const ratingA = a.rating !== undefined ? a.rating : -1;
        const ratingB = b.rating !== undefined ? b.rating : -1;
        comparison = ratingA - ratingB;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [movies, continueWatching, activeTab, favorites, selectedGenre, searchQuery, sortField, sortDirection]);

  // Extract all unique genres for collections tab
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    movies.forEach(m => m.genres?.forEach(g => set.add(g)));
    return Array.from(set).sort();
  }, [movies]);

  // Filtered TV shows based on search query
  const displayedTvShows = useMemo(() => {
    let result = [...tvShows];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(s => 
        (s.title || '').toLowerCase().includes(q) || 
        s.genres?.some(g => g.toLowerCase().includes(q))
      );
    }
    return result;
  }, [tvShows, searchQuery]);

  const activeTvShow = hoveredTvShow || selectedTvShow || displayedTvShows[0] || tvShows[0];

  // Current active backdrop
  const activeMovie = hoveredMovie || selectedMovie || displayedMovies[0] || movies[0];
  const currentBackdrop = activeTab === 'tv'
    ? (activeTvShow?.backdrop || activeTvShow?.poster)
    : activeMovie?.backdrop;

  // Format runtime from minutes to H:MM
  const formatRuntime = (minutes?: number) => {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  // Title for current view
  const currentTitle = useMemo(() => {
    if (searchQuery.trim()) {
      return `Results for "${searchQuery}"`;
    }
    switch (activeTab) {
      case 'home': 
        return continueWatching.length > 0 ? 'Continue Watching' : 'Featured Movies';
      case 'movies': return 'All Movies';
      case 'tv': return 'TV Series';
      case 'recent': return 'Recently Added';
      case 'collections': return selectedGenre ? `${selectedGenre} Movies` : 'Collections & Genres';
      case 'favorites': return 'Favorite Movies';
      case 'codecs': return 'Hardware & Codecs';
      default: return 'Movies';
    }
  }, [activeTab, continueWatching.length, selectedGenre, searchQuery]);

  return (
    <div className="relative w-screen h-screen bg-[#000000] overflow-hidden font-sans flex select-none text-[#E0E0E0]">
      {/* Global Background Layer */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentBackdrop || 'default'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 z-0 pointer-events-none"
        >
          {currentBackdrop && (
            <img 
              src={currentBackdrop} 
              alt="Backdrop" 
              className="w-full h-full object-cover opacity-25 filter blur-[1px]"
            />
          )}
          {/* Subtle Ambient Dark Room Gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/40" />
        </motion.div>
      </AnimatePresence>

      {/* Main UI Layout */}
      <Sidebar 
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'recent') {
            setSortField('year');
            setSortDirection('desc');
          }
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isConnected={isConnected}
        movieCount={movies.length}
      />
      
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Top Header Bar with Real-Time Search & Server Status Pill */}
        <div className="absolute top-6 right-8 z-30 flex items-center gap-3">
          {/* Real-Time Movie Search Input (only during movie browsing views) */}
          {activeTab !== 'codecs' && (
            <div className="relative flex items-center">
              <div className="relative group">
                <Search 
                  size={14} 
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9E9E9E] group-focus-within:text-[#FFFFFF] transition-colors pointer-events-none" 
                />
                <input
                  type="text"
                  data-tv-focus="true"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchQuery('');
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  placeholder="Search movies by title..."
                  className="w-44 sm:w-60 md:w-72 pl-9 pr-8 py-1.5 rounded-full bg-black/70 hover:bg-black/90 focus:bg-black border border-white/[0.08] focus:border-white/25 text-[#E0E0E0] focus:text-[#FFFFFF] placeholder-[#9E9E9E] text-xs transition-all backdrop-blur-md focus:outline-none cinema-focus shadow-lg"
                />
                {searchQuery && (
                  <button
                    data-tv-focus="true"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9E9E9E] hover:text-[#FFFFFF] p-0.5 rounded-full hover:bg-white/10 transition-colors focus:outline-none cinema-focus"
                    title="Clear search (Esc)"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 border border-white/10 text-[#E0E0E0] text-xs backdrop-blur-md">
              <Loader2 size={13} className="animate-spin text-[#FFFFFF]" />
              <span>Loading Emby library...</span>
            </div>
          )}

          {!isConnected && !loading && (
            <button
              data-tv-focus="true"
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/80 border border-amber-500/30 text-amber-200/90 text-xs backdrop-blur-md hover:bg-black transition-all shadow-lg cursor-pointer focus:outline-none cinema-focus"
            >
              <AlertCircle size={14} className="text-amber-400" />
              <span>Demo Mode ({movies.length} movies · {tvShows.length} series) · Connect Emby</span>
            </button>
          )}

          {isConnected && !loading && (
            <button
              data-tv-focus="true"
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/80 border border-emerald-500/30 text-emerald-200/90 text-xs backdrop-blur-md hover:bg-black transition-all shadow-lg cursor-pointer focus:outline-none cinema-focus"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Emby Online ({movies.length} movies · {tvShows.length} series)</span>
            </button>
          )}
        </div>


        {/* Collections Genre Filter Bar */}
        {activeTab === 'collections' && (
          <div className="pt-16 px-12 pb-2 flex gap-2 overflow-x-auto hide-scrollbar z-20">
            <button
              data-tv-focus="true"
              onClick={() => setSelectedGenre(null)}
              className={`px-3.5 py-1 rounded-full text-xs font-medium tracking-wide transition-all focus:outline-none cinema-focus ${
                selectedGenre === null 
                  ? 'bg-white text-black font-semibold shadow-[0_0_12px_rgba(255,255,255,0.4)]' 
                  : 'bg-white/[0.06] hover:bg-white/[0.12] text-[#E0E0E0]'
              }`}
            >
              All Genres ({movies.length})
            </button>
            {allGenres.map(genre => (
              <button
                key={genre}
                data-tv-focus="true"
                onClick={() => setSelectedGenre(genre)}
                className={`px-3.5 py-1 rounded-full text-xs font-medium tracking-wide transition-all shrink-0 focus:outline-none cinema-focus ${
                  selectedGenre === genre 
                    ? 'bg-white text-black font-semibold shadow-[0_0_12px_rgba(255,255,255,0.4)]' 
                    : 'bg-white/[0.06] hover:bg-white/[0.12] text-[#E0E0E0]'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        )}

        {/* Hardware & Codec Diagnostics Page */}
        {activeTab === 'codecs' && (
          <div className="flex-1 pt-16 overflow-hidden flex flex-col z-20">
            <CodecDiagnosticsPage onBackToHome={() => setActiveTab('home')} />
          </div>
        )}

        {/* TV Series Browsing View */}
        {activeTab === 'tv' && (
          <>
            {/* Top Content Area - Hovered/Selected TV Series details (Carousel view) */}
            {!selectedTvShow && viewMode === 'carousel' && activeTvShow && (
              <div className="flex-1 px-8 md:px-12 flex flex-col justify-center max-w-3xl pt-20 md:pt-28">
                <motion.div
                  key={activeTvShow.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <h3 className="text-xs font-medium text-[#9E9E9E] tracking-widest uppercase mb-1">
                    {activeTvShow.genres?.slice(0, 2).join(' · ') || 'TV Series'}
                  </h3>
                  <h1 className="cinema-title text-4xl md:text-5xl lg:text-6xl font-bold text-[#FFFFFF] mb-3 tracking-wide drop-shadow-lg leading-tight">
                    {activeTvShow.title}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-3 text-[#9E9E9E] text-sm font-medium">
                    {activeTvShow.rating && (
                      <div className="flex items-center gap-1 text-amber-300">
                        <Star className="fill-amber-400 text-amber-400" size={16} />
                        <span className="text-[#FFFFFF]">{activeTvShow.rating}</span>
                      </div>
                    )}
                    {activeTvShow.year && <span>{activeTvShow.year}</span>}
                    {activeTvShow.seasonsCount && (
                      <span>
                        {activeTvShow.seasonsCount} {activeTvShow.seasonsCount === 1 ? 'Season' : 'Seasons'}
                      </span>
                    )}
                    {activeTvShow.status && (
                      <span className="text-emerald-400 text-xs font-medium">
                        {activeTvShow.status}
                      </span>
                    )}
                  </div>

                  {activeTvShow.overview && (
                    <p className="mt-3 text-sm md:text-base text-[#E0E0E0]/80 line-clamp-2 max-w-2xl font-light leading-relaxed">
                      {activeTvShow.overview}
                    </p>
                  )}
                </motion.div>
              </div>
            )}

            {/* TV Shows List Area */}
            {!selectedTvShow && (
              <div className={viewMode === 'grid' ? "flex-1 pt-20 overflow-hidden" : "shrink-0 h-[48%] lg:h-[45%] flex flex-col justify-end pb-6"}>
                <TvShowGrid 
                  shows={displayedTvShows} 
                  viewMode={viewMode}
                  onSelectShow={setSelectedTvShow}
                  onHoverShow={setHoveredTvShow}
                />
              </div>
            )}
          </>
        )}

        {/* Regular Movie Browsing Views (when activeTab !== 'codecs' && activeTab !== 'tv') */}
        {activeTab !== 'codecs' && activeTab !== 'tv' && (
          <>
            {/* Top Content Area - Hovered/Selected Movie details (for Home and Carousel views) */}
            {!selectedMovie && viewMode === 'carousel' && activeMovie && (
              <div className="flex-1 px-8 md:px-12 flex flex-col justify-center max-w-3xl pt-20 md:pt-28">
                <motion.div
                  key={activeMovie.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {activeTab === 'home' && continueWatching.length > 0 && !searchQuery.trim() && (
                      <span className="px-2.5 py-0.5 rounded-full bg-white/[0.14] border border-white/20 text-[#FFFFFF] text-[10px] font-bold tracking-widest uppercase">
                        Continue Watching
                      </span>
                    )}
                    <h3 className="text-xs font-medium text-[#9E9E9E] tracking-widest uppercase">
                      {activeMovie.genres?.slice(0, 2).join(' · ') || 'Movie'}
                    </h3>
                  </div>

                  <h1 className="cinema-title text-4xl md:text-5xl lg:text-6xl font-bold text-[#FFFFFF] mb-3 tracking-wide drop-shadow-lg leading-tight">
                    {activeMovie.title}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-3 text-[#9E9E9E] text-sm font-medium">
                    {activeMovie.rating && (
                      <div className="flex items-center gap-1 text-amber-300">
                        <Star className="fill-amber-400 text-amber-400" size={16} />
                        <span className="text-[#FFFFFF]">{activeMovie.rating}</span>
                      </div>
                    )}
                    {activeMovie.year && <span>{activeMovie.year}</span>}
                    {activeMovie.runtime ? (
                      <span>{formatRuntime(activeMovie.runtime)}</span>
                    ) : null}
                    {activeMovie.resolutionBadge && (
                      <span className="text-xs text-[#E0E0E0]">{activeMovie.resolutionBadge}</span>
                    )}

                    {/* Progress Bar in Hero for in-progress movies */}
                    {activeMovie.playbackPercentage && activeMovie.playbackPercentage > 0 && (
                      <div className="flex items-center gap-2 ml-2 pl-3 border-l border-white/10">
                        <div className="w-20 h-1.5 rounded-full bg-white/20 overflow-hidden">
                          <div 
                            className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]" 
                            style={{ width: `${activeMovie.playbackPercentage}%` }} 
                          />
                        </div>
                        <span className="text-xs text-white/90 font-mono">
                          {activeMovie.playbackPercentage}%
                        </span>
                      </div>
                    )}
                  </div>

                  {activeMovie.overview && (
                    <p className="mt-3 text-sm md:text-base text-[#E0E0E0]/80 line-clamp-2 max-w-2xl font-light leading-relaxed">
                      {activeMovie.overview}
                    </p>
                  )}

                  {/* Quick Action Buttons in Hero: Play/Resume and Details */}
                  <div className="flex items-center gap-3 mt-5">
                    <button
                      data-tv-focus="true"
                      onClick={() => handlePlayMovie(activeMovie, activeMovie.playbackPositionSeconds || 0)}
                      className="px-6 py-2.5 rounded-xl bg-white text-black font-semibold text-sm flex items-center gap-2 hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 transition-all cinema-focus cursor-pointer"
                    >
                      <Play size={16} className="fill-black" />
                      <span>{activeMovie.playbackPositionSeconds ? 'Resume' : 'Play'}</span>
                    </button>
                    <button
                      data-tv-focus="true"
                      onClick={() => setSelectedMovie(activeMovie)}
                      className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm border border-white/15 active:scale-95 transition-all cinema-focus cursor-pointer backdrop-blur-md"
                    >
                      <span>Details</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Movies Area (Carousel or Wall Grid) */}
            {!selectedMovie && (
              <div className={viewMode === 'grid' ? "flex-1 pt-20 overflow-hidden" : "shrink-0 h-[48%] lg:h-[45%] flex flex-col justify-end pb-6"}>
                <MovieGrid 
                  title={currentTitle}
                  movies={displayedMovies} 
                  onHover={setHoveredMovie} 
                  onSelect={setSelectedMovie} 
                  onPlay={(movie, resumeSeconds) => handlePlayMovie(movie, resumeSeconds || 0)}
                  viewMode={viewMode}
                  onToggleViewMode={() => setViewMode(prev => prev === 'carousel' ? 'grid' : 'carousel')}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSortChange={(field, direction) => {
                    setSortField(field);
                    setSortDirection(direction);
                  }}
                  showSortControls={true}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Overlays */}
      <MovieDetails 
        movie={selectedMovie} 
        onClose={() => setSelectedMovie(null)} 
        onPlay={(resumeSeconds) => selectedMovie && handlePlayMovie(selectedMovie, resumeSeconds)} 
      />

      {selectedTvShow && (
        <TvShowDetails 
          show={selectedTvShow}
          settings={settings}
          isConnected={isConnected}
          onClose={() => setSelectedTvShow(null)}
          onPlayEpisode={handlePlayEpisode}
        />
      )}

      {playingMovie && (
        <VideoPlayer 
          movie={playingMovie} 
          nextMovie={nextPlayableMovie}
          onPlayNext={(next) => handlePlayMovie(next, 0)}
          initialTime={resumeTime}
          settings={settings}
          onClose={() => setPlayingMovie(null)} 
          onProgressUpdate={handleProgressUpdate}
        />
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={handleCloseSettings} 
        currentSettings={settings}
        onSave={handleSaveSettings}
        onOpenCodecs={() => {
          setActiveTab('codecs');
          setSelectedMovie(null);
        }}
      />

      {/* Living Room TV Remote / Gamepad Navigation Hint Overlay */}
      <TvRemoteOverlay visible={isTvMode} isPlaying={!!playingMovie} />
    </div>
  );
}

