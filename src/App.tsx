/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Movie, ServerSettings, SortField, SortDirection } from './types';
import { MOCK_MOVIES } from './mockData';
import { fetchEmbyMovies, fetchEmbyResumeItems, reportPlaybackProgress } from './api/emby';
import { Sidebar, NavTab } from './components/Sidebar';
import { MovieGrid } from './components/MovieGrid';
import { MovieDetails } from './components/MovieDetails';
import { VideoPlayer } from './components/VideoPlayer';
import { ContinueWatchingRow } from './components/ContinueWatchingRow';
import { CodecDiagnosticsPage } from './components/CodecDiagnosticsPage';
import { SettingsModal } from './components/SettingsModal';
import { 
  getSavedPlaybackProgress, 
  savePlaybackProgress, 
  removePlaybackProgress, 
  attachLocalProgressToMovies 
} from './utils/playbackStorage';
import { AnimatePresence, motion } from 'motion/react';
import { Star, EyeOff, Server, AlertCircle, Loader2, Search, X } from 'lucide-react';

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
  const [playingMovie, setPlayingMovie] = useState<Movie | null>(null);
  const [resumeTime, setResumeTime] = useState<number>(0);
  const [hoveredMovie, setHoveredMovie] = useState<Movie | null>(null);

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

  // Fetch movies and incomplete playback (Continue Watching) data whenever settings change
  useEffect(() => {
    async function loadMovies() {
      if (settings.url && settings.apiKey) {
        setLoading(true);
        setError(null);
        try {
          // Parallel fetch: Library items & Incomplete playback (Resume) items
          const [embyMovies, resumeItems] = await Promise.all([
            fetchEmbyMovies(settings),
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
        } catch (err: any) {
          console.error("Failed to fetch Emby library:", err);
          setError(err.message || "Failed to reach Emby. Showing demo data.");
          setMovies(attachLocalProgressToMovies(MOCK_MOVIES));
          setIsConnected(false);
        } finally {
          setLoading(false);
        }
      } else {
        const demoMoviesWithProgress = attachLocalProgressToMovies(MOCK_MOVIES);
        setMovies(demoMoviesWithProgress);
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
  }, [settings]);

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
        const sourceMovie = existing || movies.find(m => m.id === movieId);
        if (!sourceMovie) return prev;

        const updated: Movie = {
          ...sourceMovie,
          playbackPositionSeconds: Math.floor(positionSeconds),
          playbackPercentage: percentage,
          lastWatchedAt: Date.now()
        };
        const rest = prev.filter(m => m.id !== movieId);
        return [updated, ...rest];
      });

      setMovies(prev => prev.map(m => m.id === movieId ? { ...m, playbackPositionSeconds: Math.floor(positionSeconds), playbackPercentage: percentage } : m));
    }
  }, [isConnected, settings, movies]);

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
  }, []);

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

    if (activeTab === 'favorites') {
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
  }, [movies, activeTab, favorites, selectedGenre, searchQuery, sortField, sortDirection]);

  // Extract all unique genres for collections tab
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    movies.forEach(m => m.genres?.forEach(g => set.add(g)));
    return Array.from(set).sort();
  }, [movies]);

  // Current active backdrop
  const activeMovie = hoveredMovie || selectedMovie || displayedMovies[0] || movies[0];
  const currentBackdrop = activeMovie?.backdrop;

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
      case 'home': return 'Featured Movies';
      case 'movies': return 'All Movies';
      case 'recent': return 'Recently Added';
      case 'collections': return selectedGenre ? `${selectedGenre} Movies` : 'Collections & Genres';
      case 'favorites': return 'Favorite Movies';
      case 'codecs': return 'Hardware & Codecs';
      default: return 'Movies';
    }
  }, [activeTab, selectedGenre, searchQuery]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-sans flex select-none text-white">
      {/* Global Background Layer */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentBackdrop || 'default'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 z-0"
        >
          {currentBackdrop && (
            <img 
              src={currentBackdrop} 
              alt="Backdrop" 
              className="w-full h-full object-cover"
            />
          )}
          {/* Gradient Overlays for glassmorphic depth */}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-transparent" />
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
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-cyan-400 transition-colors pointer-events-none" 
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchQuery('');
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  placeholder="Search movies by title..."
                  className="w-44 sm:w-60 md:w-72 pl-9 pr-8 py-1.5 rounded-full bg-black/60 hover:bg-black/75 focus:bg-black/90 border border-white/20 focus:border-cyan-400 text-white placeholder-white/40 text-xs transition-all backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-cyan-400/25 shadow-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors"
                    title="Clear search (Esc)"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-xs backdrop-blur-md">
              <Loader2 size={13} className="animate-spin text-cyan-400" />
              <span>Loading Emby library...</span>
            </div>
          )}

          {!isConnected && !loading && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-200 text-xs backdrop-blur-md hover:bg-amber-900/80 transition-colors shadow-lg cursor-pointer"
            >
              <AlertCircle size={14} className="text-amber-400" />
              <span>Demo Mode ({movies.length} movies) • Connect Emby</span>
            </button>
          )}

          {isConnected && !loading && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs backdrop-blur-md hover:bg-emerald-900/80 transition-colors shadow-lg cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Emby Online ({movies.length} movies)</span>
            </button>
          )}
        </div>


        {/* Collections Genre Filter Bar */}
        {activeTab === 'collections' && (
          <div className="pt-16 px-12 pb-2 flex gap-2 overflow-x-auto hide-scrollbar z-20">
            <button
              onClick={() => setSelectedGenre(null)}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                selectedGenre === null 
                  ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.6)]' 
                  : 'bg-white/10 hover:bg-white/20 text-white/80'
              }`}
            >
              All Genres ({movies.length})
            </button>
            {allGenres.map(genre => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-all shrink-0 ${
                  selectedGenre === genre 
                    ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.6)]' 
                    : 'bg-white/10 hover:bg-white/20 text-white/80'
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

        {/* Regular Movie Browsing Views (when activeTab !== 'codecs') */}
        {activeTab !== 'codecs' && (
          <>
            {/* Continue Watching Row (Pulls Incomplete Playback Data from Emby API) */}
            {activeTab === 'home' && !searchQuery && !selectedMovie && continueWatching.length > 0 && (
              <div className="pt-20 px-8 md:px-12 z-20 shrink-0">
                <ContinueWatchingRow 
                  movies={continueWatching}
                  onPlay={handlePlayMovie}
                  onSelect={setSelectedMovie}
                  onHover={setHoveredMovie}
                  onDismiss={handleDismissContinueWatching}
                />
              </div>
            )}

            {/* Top Content Area - Hovered/Selected Movie details (for Home and Carousel views) */}
            {!selectedMovie && viewMode === 'carousel' && activeMovie && (
              <div className={`flex-1 px-8 md:px-12 flex flex-col justify-center max-w-3xl ${
                activeTab === 'home' && continueWatching.length > 0 ? 'pt-2 pb-2' : 'pt-20 md:pt-28'
              }`}>
                <motion.div
                  key={activeMovie.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <h3 className="text-lg md:text-xl font-medium text-white/80 mb-1">
                    {activeMovie.genres?.slice(0, 2).join(' • ') || 'Movie'}
                  </h3>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight drop-shadow-lg leading-tight">
                    {activeMovie.title}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-4 text-white/90 text-base md:text-lg font-medium drop-shadow-md">
                    {activeMovie.rating && (
                      <div className="flex items-center gap-1.5">
                        <Star className="fill-amber-400 text-amber-400" size={19} />
                        <span>{activeMovie.rating}</span>
                      </div>
                    )}
                    {activeMovie.contentRating && (
                      <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold border border-white/40 backdrop-blur-sm uppercase">
                        {activeMovie.contentRating}
                      </span>
                    )}
                    {activeMovie.year && <span>{activeMovie.year}</span>}
                    {activeMovie.runtime ? (
                      <>
                        <span>-</span>
                        <span>{formatRuntime(activeMovie.runtime)}</span>
                      </>
                    ) : null}
                    {activeMovie.resolutionBadge && (
                      <span className="bg-white/20 px-2 py-0.5 rounded text-[11px] font-bold tracking-widest border border-white/40 backdrop-blur-sm uppercase">
                        {activeMovie.resolutionBadge}
                      </span>
                    )}
                  </div>

                  {activeMovie.overview && (
                    <p className="mt-3 text-sm md:text-base text-white/80 line-clamp-2 max-w-2xl font-light drop-shadow">
                      {activeMovie.overview}
                    </p>
                  )}
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

      {playingMovie && (
        <VideoPlayer 
          movie={playingMovie} 
          initialTime={resumeTime}
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
    </div>
  );
}

