import { Movie } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Play, ArrowLeft, Star, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

interface MovieDetailsProps {
  movie: Movie | null;
  onClose: () => void;
  onPlay: (resumeSeconds?: number) => void;
}

export function MovieDetails({ movie, onClose, onPlay }: MovieDetailsProps) {
  // Format runtime from minutes to H:MM
  const formatRuntime = (minutes?: number) => {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const hasResume = !!(movie?.playbackPositionSeconds && movie.playbackPositionSeconds > 10);

  // Keyboard navigation for TV remotes
  useEffect(() => {
    if (!movie) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        // If user presses Enter without focusing another button, default to Play/Resume
        if (document.activeElement?.tagName !== 'BUTTON') {
          e.preventDefault();
          onPlay(hasResume ? movie.playbackPositionSeconds : 0);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movie, hasResume, onClose, onPlay]);

  return (
    <AnimatePresence>
      {movie && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black flex text-white"
        >
          {/* Background Backdrop for Details */}
          <div className="absolute inset-0 z-0">
            {movie.backdrop && (
              <>
                <img 
                  src={movie.backdrop} 
                  alt="" 
                  className="w-full h-full object-cover" 
                />
                {/* Complex gradient overlay to blend into background */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent w-full md:w-2/3" />
              </>
            )}
          </div>

          {/* Content */}
          <div className="relative z-10 w-full h-full flex flex-col p-8 md:p-16 overflow-y-auto custom-scrollbar">
            {/* Top Bar */}
            <div className="mb-6 md:mb-10">
              <button 
                onClick={onClose}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-full px-2 py-1"
              >
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors backdrop-blur-md">
                  <ArrowLeft size={20} />
                </div>
                <span className="font-medium tracking-wide">Back (Esc)</span>
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-12 lg:gap-20 flex-1 max-w-7xl mx-auto w-full items-start">
              {/* Poster Column */}
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="shrink-0 w-64 md:w-80 lg:w-96 relative group cursor-pointer"
                onClick={onPlay}
              >
                <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] border-2 border-white/10 transition-colors group-hover:border-cyan-400">
                  {movie.poster ? (
                    <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800" />
                  )}
                  {/* Play button overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <div className="w-20 h-20 rounded-full bg-cyan-600/80 flex items-center justify-center text-white border border-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.8)]">
                      <Play fill="currentColor" size={32} className="ml-2" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Details Column */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col justify-center flex-1 max-w-3xl pt-2"
              >
                {/* Title & Metadata */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg tracking-tight">
                  {movie.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 mb-5 text-white/90 font-semibold text-lg md:text-xl">
                  {movie.rating && (
                    <div className="flex items-center gap-1.5">
                      <Star className="fill-amber-400 text-amber-400" size={20} />
                      <span>{movie.rating}</span>
                    </div>
                  )}
                  {movie.contentRating && (
                    <span className="bg-white/20 px-2 py-0.5 rounded text-sm font-bold border border-white/40 backdrop-blur-sm uppercase">
                      {movie.contentRating}
                    </span>
                  )}
                  {movie.year && <span>{movie.year}</span>}
                  <span>-</span>
                  {movie.runtime && <span>{formatRuntime(movie.runtime)}</span>}
                  
                  {/* Media Badges */}
                  {(movie.hdrBadge || !movie.resolutionBadge) && (
                    <span className="bg-white/20 px-2 py-0.5 rounded text-[11px] font-bold tracking-widest border border-white/40 backdrop-blur-sm uppercase">
                      {movie.hdrBadge || 'HDR10+'}
                    </span>
                  )}
                  <span className="bg-white/20 px-2 py-0.5 rounded text-[11px] font-bold tracking-widest border border-white/40 backdrop-blur-sm uppercase">
                    {movie.resolutionBadge || 'UHD'}
                  </span>
                </div>

                {/* Primary Action Button Row (TV Remote optimized) */}
                <div className="flex flex-wrap items-center gap-4 mb-7">
                  {hasResume ? (
                    <>
                      <button
                        autoFocus
                        onClick={() => onPlay(movie.playbackPositionSeconds)}
                        className="flex items-center gap-3 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base shadow-[0_0_25px_rgba(6,182,212,0.6)] focus:outline-none focus:ring-4 focus:ring-cyan-300 transform focus:scale-105 transition-all cursor-pointer"
                      >
                        <Play size={20} fill="currentColor" />
                        <span>Resume from {Math.floor((movie.playbackPositionSeconds || 0) / 60)}m ({Math.round(movie.playbackPercentage || 0)}%)</span>
                        <span className="px-1.5 py-0.5 rounded bg-black/30 border border-white/20 text-[10px] font-mono ml-2">ENTER</span>
                      </button>

                      <button
                        onClick={() => onPlay(0)}
                        className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white font-semibold text-sm border border-white/20 transition-all cursor-pointer"
                        title="Play from start"
                      >
                        <RotateCcw size={16} />
                        <span>Start from Beginning</span>
                      </button>
                    </>
                  ) : (
                    <button
                      autoFocus
                      onClick={() => onPlay(0)}
                      className="flex items-center gap-3 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base shadow-[0_0_25px_rgba(6,182,212,0.6)] focus:outline-none focus:ring-4 focus:ring-cyan-300 transform focus:scale-105 transition-all cursor-pointer"
                    >
                      <Play size={20} fill="currentColor" />
                      <span>Play Movie</span>
                      <span className="px-1.5 py-0.5 rounded bg-black/30 border border-white/20 text-[10px] font-mono ml-2">ENTER</span>
                    </button>
                  )}
                </div>
                
                {/* Audio/Subtitles row */}
                <div className="flex flex-wrap items-center gap-6 mb-8 text-white/70 text-sm font-medium">
                  {movie.audioTracks && movie.audioTracks.length > 0 ? (
                    movie.audioTracks.map((audio, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-white/50">{audio.lang}</span>
                        <span className="font-bold text-white">{audio.format}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-white/50">ENG</span>
                        <span className="font-bold text-white">dts:X</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/50">FRE</span>
                        <span className="font-bold text-white">Dolby 5.1</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-white/50 border border-white/30 rounded px-1 text-[10px]">CC</span>
                    <span className="text-white">{movie.subtitles && movie.subtitles.length > 0 ? movie.subtitles.join(' • ') : 'ENG • FRE'}</span>
                  </div>
                </div>

                {/* Overview */}
                <div className="mb-10">
                  <p className="text-white/90 text-base md:text-lg leading-relaxed font-light drop-shadow-md">
                    {movie.overview || 'No overview available.'}
                  </p>
                </div>

                {/* Additional Info Table */}
                <div className="grid grid-cols-[100px_1fr] md:grid-cols-[120px_1fr] gap-y-3 text-sm md:text-base">
                  <div className="text-white/60 font-bold tracking-wider uppercase text-xs md:text-sm pt-1">Categories</div>
                  <div className="text-white font-medium">{movie.genres ? movie.genres.join(', ') : '-'}</div>
                  
                  <div className="text-white/60 font-bold tracking-wider uppercase text-xs md:text-sm pt-1">Director</div>
                  <div className="text-white font-medium">{movie.director || '-'}</div>
                  
                  <div className="text-white/60 font-bold tracking-wider uppercase text-xs md:text-sm pt-1">Cast</div>
                  <div className="text-white font-medium">{movie.cast ? movie.cast.join(', ') : '-'}</div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

