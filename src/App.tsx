/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Movie, ServerSettings } from './types';
import { MOCK_MOVIES } from './mockData';
import { fetchEmbyMovies } from './api/emby';
import { Sidebar } from './components/Sidebar';
import { MovieGrid } from './components/MovieGrid';
import { MovieDetails } from './components/MovieDetails';
import { VideoPlayer } from './components/VideoPlayer';
import { SettingsModal } from './components/SettingsModal';
import { AnimatePresence, motion } from 'motion/react';
import { Star, EyeOff } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<ServerSettings>({ url: 'http://192.168.10.146:8096', apiKey: '' });
  const [movies, setMovies] = useState<Movie[]>(MOCK_MOVIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [playingMovie, setPlayingMovie] = useState<Movie | null>(null);
  const [hoveredMovie, setHoveredMovie] = useState<Movie | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true); // Open settings by default initially

  // Determine current active backdrop
  const activeMovie = hoveredMovie || selectedMovie || movies[0];
  const currentBackdrop = activeMovie?.backdrop;

  useEffect(() => {
    async function loadMovies() {
      if (settings.url && settings.apiKey) {
        setLoading(true);
        setError(null);
        try {
          const embyMovies = await fetchEmbyMovies(settings);
          if (embyMovies.length > 0) {
            setMovies(embyMovies);
          } else {
            setError("No movies found on server.");
          }
        } catch (err) {
          console.error(err);
          setError("Failed to connect. Showing demo data.");
          setMovies(MOCK_MOVIES);
        } finally {
          setLoading(false);
        }
      } else {
        setMovies(MOCK_MOVIES);
      }
    }
    loadMovies();
  }, [settings]);

  // Format runtime from minutes to H:MM
  const formatRuntime = (minutes?: number) => {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

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
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Main UI Layout */}
      <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />
      
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Top Content Area - Shows hovered movie details like the first screenshot */}
        {!selectedMovie && activeMovie && (
          <div className="flex-1 px-12 pt-32 flex flex-col justify-center max-w-3xl">
            <motion.div
              key={activeMovie.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-xl md:text-2xl font-medium text-white/90 mb-1">Movie</h3>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight drop-shadow-lg">
                {activeMovie.title}
              </h1>
              
              <div className="flex items-center gap-4 text-white/90 text-lg md:text-xl font-medium drop-shadow-md">
                {activeMovie.rating && (
                  <div className="flex items-center gap-1.5">
                    <Star className="fill-white text-white" size={20} />
                    <span>{activeMovie.rating}</span>
                  </div>
                )}
                <EyeOff size={20} className="text-white/80" />
                {activeMovie.contentRating && (
                  <span className="bg-white/20 px-2 py-0.5 rounded text-sm font-bold border border-white/40 backdrop-blur-sm">{activeMovie.contentRating}</span>
                )}
                {activeMovie.year && <span>{activeMovie.year}</span>}
                <span>-</span>
                {activeMovie.runtime && <span>{formatRuntime(activeMovie.runtime)}</span>}
              </div>
            </motion.div>
          </div>
        )}

        {/* Bottom Horizontal Carousel */}
        {!selectedMovie && (
          <div className="shrink-0 h-[45%] lg:h-[40%] flex flex-col justify-end pb-8">
            <MovieGrid 
              movies={movies} 
              onHover={setHoveredMovie} 
              onSelect={setSelectedMovie} 
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
        onSave={setSettings}
      />
    </div>
  );
}
