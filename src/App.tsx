/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Movie, ServerSettings } from './types';
import { MOCK_MOVIES } from './mockData';
import { fetchEmbyMovies } from './api/emby';
import { Sidebar, NavTab } from './components/Sidebar';
import { MovieGrid } from './components/MovieGrid';
import { MovieDetails } from './components/MovieDetails';
import { VideoPlayer } from './components/VideoPlayer';
import { SettingsModal } from './components/SettingsModal';
import { AnimatePresence, motion } from 'motion/react';
import { Star, EyeOff, Server, AlertCircle, Loader2 } from 'lucide-react';

const STORAGE_KEY = 'rvemby_server_settings';
const FAVORITES_KEY = 'rvemby_favorites';

export default function App() {
  // Load saved settings from localStorage
  const [settings, setSettings] = useState<ServerSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse saved settings:", e);
    }
    return { url: 'http://192.168.10.146:8096', apiKey: '' };
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [movies, setMovies] = useState<Movie[]>(MOCK_MOVIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [playingMovie, setPlayingMovie] = useState<Movie | null>(null);
  const [hoveredMovie, setHoveredMovie] = useState<Movie | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(() => !settings.apiKey);

  // Fetch movies whenever settings change
  useEffect(() => {
    async function loadMovies() {
      if (settings.url && settings.apiKey) {
        setLoading(true);
        setError(null);
        try {
          const embyMovies = await fetchEmbyMovies(settings);
          if (embyMovies.length > 0) {
            setMovies(embyMovies);
            setIsConnected(true);
            setError(null);
          } else {
            setError("Connected to Emby, but no movies were found.");
            setIsConnected(true);
          }
        } catch (err: any) {
          console.error("Failed to fetch Emby library:", err);
          setError(err.message || "Failed to reach Emby. Showing demo data.");
          setMovies(MOCK_MOVIES);
          setIsConnected(false);
        } finally {
          setLoading(false);
        }
      } else {
        setMovies(MOCK_MOVIES);
        setIsConnected(false);
      }
    }
    loadMovies();
  }, [settings]);

  // Handle saving settings to state & localStorage
  const handleSaveSettings = (newSettings: ServerSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error("Failed to save settings:", e);
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

  // Filter & sort movies based on current active tab
  const displayedMovies = useMemo(() => {
    let result = [...movies];

    if (activeTab === 'recent') {
      result.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (activeTab === 'favorites') {
      result = result.filter(m => favorites.includes(m.id));
    } else if (activeTab === 'collections') {
      if (selectedGenre) {
        result = result.filter(m => m.genres && m.genres.includes(selectedGenre));
      }
    }

    return result;
  }, [movies, activeTab, favorites, selectedGenre]);

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
    switch (activeTab) {
      case 'home': return 'Featured Movies';
      case 'movies': return 'All Movies';
      case 'recent': return 'Recently Added';
      case 'collections': return selectedGenre ? `${selectedGenre} Movies` : 'Collections & Genres';
      case 'favorites': return 'Favorite Movies';
      default: return 'Movies';
    }
  }, [activeTab, selectedGenre]);

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
          if (tab === 'movies') {
            // Keep user preference or default to grid when browsing library
          }
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isConnected={isConnected}
        movieCount={movies.length}
      />
      
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Top Header Bar with Server Status Pill */}
        <div className="absolute top-6 right-8 z-30 flex items-center gap-3">
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

        {/* Top Content Area - Hovered/Selected Movie details (for Home and Carousel views) */}
        {!selectedMovie && viewMode === 'carousel' && activeMovie && (
          <div className="flex-1 px-8 md:px-12 pt-20 md:pt-28 flex flex-col justify-center max-w-3xl">
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
            />
          </div>
        )}
      </div>

      {/* Overlays */}
      <MovieDetails 
        movie={selectedMovie} 
        onClose={() => setSelectedMovie(null)} 
        onPlay={() => setPlayingMovie(selectedMovie)} 
      />

      {playingMovie && (
        <VideoPlayer 
          movie={playingMovie} 
          onClose={() => setPlayingMovie(null)} 
        />
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        currentSettings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

