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
          data-tv-modal="true"
          className="fixed inset-0 z-40 bg-[#000000] flex text-[#E0E0E0]"
        >
          {/* Background Backdrop for Details */}
          <div className="absolute inset-0 z-0">
            {movie.backdrop && (
              <>
                <img 
                  src={movie.backdrop} 
                  alt="" 
                  className="w-full h-full object-cover opacity-35" 
                />
                {/* Complex gradient overlay to blend into pitch black background */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-transparent w-full md:w-3/4" />
              </>
            )}
          </div>

          {/* Content */}
          <div className="relative z-10 w-full h-full flex flex-col p-8 md:p-16 overflow-y-auto custom-scrollbar">
            {/* Top Bar */}
            <div className="mb-6 md:mb-10">
              <button 
                data-tv-focus="true"
                onClick={onClose}
                className="flex items-center gap-2 text-[#9E9E9E] hover:text-[#FFFFFF] transition-colors group focus:outline-none rounded-full px-2 py-1 cinema-focus"
              >
                <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.12] transition-colors backdrop-blur-md border border-white/[0.08]">
                  <ArrowLeft size={18} />
                </div>
                <span className="font-medium tracking-wide text-xs sm:text-sm">Back (Esc)</span>
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-12 lg:gap-20 flex-1 max-w-7xl mx-auto w-full items-start">
              {/* Poster Column */}
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                tabIndex={0}
                data-tv-focus="true"
                className="shrink-0 w-64 md:w-80 lg:w-96 relative group cursor-pointer focus:outline-none rounded-2xl cinema-focus"
                onClick={() => onPlay()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPlay();
                  }
                }}
              >
                <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.95)] border border-white/[0.08] transition-all bg-[#000000]">
                  {movie.poster ? (
                    <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover opacity-90" />
                  ) : (
                    <div className="w-full h-full bg-[#000000]" />
                  )}
                  {/* Play button overlay */}
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                    <div className="w-16 h-16 rounded-full bg-white/[0.15] backdrop-blur-md flex items-center justify-center text-[#FFFFFF] border border-white/[0.25] shadow-[0_0_24px_rgba(255,255,255,0.25)]">
                      <Play fill="currentColor" size={26} className="ml-1" />
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
                <h1 className="cinema-title text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#FFFFFF] mb-4 drop-shadow-lg tracking-wide">
                  {movie.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-3 mb-5 text-[#E0E0E0] font-medium text-sm md:text-base">
                  {movie.rating && (
                    <div className="flex items-center gap-1.5 text-amber-300">
                      <Star className="fill-amber-300" size={17} />
                      <span className="font-semibold">{movie.rating}</span>
                    </div>
                  )}
                  {movie.contentRating && (
                    <span className="bg-white/[0.06] px-2 py-0.5 rounded text-xs font-semibold border border-white/[0.08] uppercase">
                      {movie.contentRating}
                    </span>
                  )}
                  {movie.year && <span>{movie.year}</span>}
                  <span className="text-[#9E9E9E]">·</span>
                  {movie.runtime && <span>{formatRuntime(movie.runtime)}</span>}
                  
                  {/* Media Badges */}
                  {(movie.hdrBadge || !movie.resolutionBadge) && (
                    <span className="bg-white/[0.06] px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider border border-white/[0.08] uppercase text-[#E0E0E0]">
                      {movie.hdrBadge || 'HDR10+'}
                    </span>
                  )}
                  <span className="bg-white/[0.06] px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider border border-white/[0.08] uppercase text-[#E0E0E0]">
                    {movie.resolutionBadge || 'UHD'}
                  </span>
                </div>

                {/* Primary Action Button Row (TV Remote optimized with soft glowing outline) */}
                <div className="flex flex-wrap items-center gap-4 mb-7">
                  {hasResume ? (
                    <>
                      <button
                        autoFocus
                        data-tv-focus="true"
                        onClick={() => onPlay(movie.playbackPositionSeconds)}
                        className="flex items-center gap-3 px-7 py-3 rounded-xl bg-white/[0.16] hover:bg-white/[0.24] text-[#FFFFFF] font-semibold text-sm shadow-[0_0_24px_rgba(255,255,255,0.18)] border border-white/[0.2] transition-all cursor-pointer cinema-focus"
                      >
                        <Play size={18} fill="currentColor" />
                        <span>Resume ({Math.floor((movie.playbackPositionSeconds || 0) / 60)}m)</span>
                        <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[9px] font-mono text-[#9E9E9E]">ENTER</span>
                      </button>

                      <button
                        data-tv-focus="true"
                        onClick={() => onPlay(0)}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#E0E0E0] hover:text-[#FFFFFF] font-medium text-sm border border-white/[0.08] transition-all cursor-pointer cinema-focus"
                        title="Play from start"
                      >
                        <RotateCcw size={15} />
                        <span>Start Over</span>
                      </button>
                    </>
                  ) : (
                    <button
                      autoFocus
                      data-tv-focus="true"
                      onClick={() => onPlay(0)}
                      className="flex items-center gap-3 px-8 py-3 rounded-xl bg-white/[0.16] hover:bg-white/[0.24] text-[#FFFFFF] font-semibold text-base shadow-[0_0_24px_rgba(255,255,255,0.18)] border border-white/[0.2] transition-all cursor-pointer cinema-focus"
                    >
                      <Play size={18} fill="currentColor" />
                      <span>Play Movie</span>
                      <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[9px] font-mono text-[#9E9E9E]">ENTER</span>
                    </button>
                  )}
                </div>
                
                {/* Audio/Subtitles row */}
                <div className="flex flex-wrap items-center gap-6 mb-7 text-[#9E9E9E] text-xs font-medium">
                  {movie.audioTracks && movie.audioTracks.length > 0 ? (
                    movie.audioTracks.map((audio, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-[#9E9E9E]">{audio.lang}</span>
                        <span className="font-semibold text-[#E0E0E0]">{audio.format}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#9E9E9E]">ENG</span>
                        <span className="font-semibold text-[#E0E0E0]">Dolby Atmos</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#9E9E9E]">FRE</span>
                        <span className="font-semibold text-[#E0E0E0]">Dolby 5.1</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[#9E9E9E] border border-white/15 rounded px-1 text-[9px]">CC</span>
                    <span className="text-[#E0E0E0]">{movie.subtitles && movie.subtitles.length > 0 ? movie.subtitles.join(' · ') : 'ENG · FRE'}</span>
                  </div>
                </div>

                {/* Overview */}
                <div className="mb-8">
                  <p className="text-[#E0E0E0] text-sm md:text-base leading-relaxed font-normal">
                    {movie.overview || 'No overview available.'}
                  </p>
                </div>

                {/* Additional Info Table */}
                <div className="grid grid-cols-[90px_1fr] md:grid-cols-[110px_1fr] gap-y-2.5 text-xs md:text-sm">
                  <div className="text-[#9E9E9E] font-medium uppercase tracking-wider text-[11px] pt-0.5">Genres</div>
                  <div className="text-[#E0E0E0] font-normal">{movie.genres ? movie.genres.join(', ') : '-'}</div>
                  
                  <div className="text-[#9E9E9E] font-medium uppercase tracking-wider text-[11px] pt-0.5">Director</div>
                  <div className="text-[#E0E0E0] font-normal">{movie.director || '-'}</div>
                  
                  <div className="text-[#9E9E9E] font-medium uppercase tracking-wider text-[11px] pt-0.5">Cast</div>
                  <div className="text-[#E0E0E0] font-normal">{movie.cast ? movie.cast.join(', ') : '-'}</div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

