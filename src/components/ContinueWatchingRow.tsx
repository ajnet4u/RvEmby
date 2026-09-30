import React, { useRef } from 'react';
import { Movie } from '../types';
import { Play, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface ContinueWatchingRowProps {
  movies: Movie[];
  onPlay: (movie: Movie, resumeSeconds?: number) => void;
  onSelect: (movie: Movie) => void;
  onHover?: (movie: Movie) => void;
  onDismiss?: (movieId: string) => void;
}

export function ContinueWatchingRow({
  movies,
  onPlay,
  onSelect,
  onHover,
  onDismiss
}: ContinueWatchingRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!movies || movies.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const formatRemaining = (movie: Movie) => {
    const totalMinutes = movie.runtime || 0;
    if (totalMinutes > 0 && movie.playbackPercentage) {
      const remaining = Math.max(1, Math.round(totalMinutes * (1 - movie.playbackPercentage / 100)));
      return `${remaining}m left`;
    }
    if (movie.playbackPositionSeconds) {
      const m = Math.floor(movie.playbackPositionSeconds / 60);
      return `At ${m}m`;
    }
    return `${Math.round(movie.playbackPercentage || 0)}%`;
  };

  return (
    <div className="w-full mb-6 z-20 select-none">
      {/* Section Title Bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
          <h2 className="cinema-title text-xs md:text-sm font-semibold tracking-wider uppercase text-[#FFFFFF]">
            Continue Watching
          </h2>
          <span className="text-[11px] font-medium text-[#9E9E9E] tracking-wider">
            ({movies.length})
          </span>
        </div>

        {/* Scroll Arrows */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-[#9E9E9E] hover:text-[#FFFFFF] border border-white/[0.06] transition-colors cursor-pointer cinema-focus"
            title="Scroll Left"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-[#9E9E9E] hover:text-[#FFFFFF] border border-white/[0.06] transition-colors cursor-pointer cinema-focus"
            title="Scroll Right"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={scrollRef}
        className="flex items-center gap-4 overflow-x-auto hide-scrollbar scroll-smooth py-1 px-1 -mx-1"
      >
        {movies.map((movie, index) => {
          const percentage = Math.min(100, Math.max(5, movie.playbackPercentage || 10));
          const remainingText = formatRemaining(movie);
          const imageSrc = movie.backdrop || movie.poster;

          return (
            <motion.div
              key={movie.id}
              tabIndex={0}
              data-tv-focus="true"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.3 }}
              onMouseEnter={() => onHover && onHover(movie)}
              onFocus={(e) => {
                if (onHover) onHover(movie);
                e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPlay(movie, movie.playbackPositionSeconds);
                }
              }}
              onClick={() => onPlay(movie, movie.playbackPositionSeconds)}
              className="group relative w-60 sm:w-64 md:w-72 aspect-video shrink-0 rounded-xl overflow-hidden bg-[#000000] border border-white/[0.04] hover:border-white/[0.15] focus:border-white/[0.3] shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.12)] focus:shadow-[0_0_25px_rgba(255,255,255,0.25)] focus:outline-none focus:ring-2 focus:ring-white/40 focus:scale-105 transition-all duration-300 cursor-pointer transform hover:-translate-y-1 focus:-translate-y-1 z-10 focus:z-30 cinema-focus"
            >
              {/* Backdrop / Poster Image */}
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#000000] text-[#9E9E9E] font-mono text-xs">
                  {movie.title}
                </div>
              )}

              {/* Gradient Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />

              {/* Center Play Button (Reveals on Hover / Focus) */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200">
                <div className="w-11 h-11 rounded-full bg-white/[0.15] backdrop-blur-md text-[#FFFFFF] border border-white/[0.25] flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] transform scale-90 group-hover:scale-100 group-focus:scale-100 transition-transform">
                  <Play size={18} className="fill-[#FFFFFF] ml-0.5" />
                </div>
              </div>

              {/* Top Details & Dismiss Button */}
              {onDismiss && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(movie.id);
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-[#9E9E9E] hover:text-[#FFFFFF] hover:bg-black/95 border border-white/[0.08] opacity-0 group-hover:opacity-100 transition-opacity z-10 cinema-focus"
                  title="Remove from continue watching"
                >
                  <X size={12} />
                </button>
              )}

              {/* Bottom Metadata & Progress Information */}
              <div className="absolute bottom-2.5 left-3 right-3 flex flex-col gap-1 pointer-events-none">
                <h3 className="text-xs md:text-sm font-semibold text-[#FFFFFF] truncate drop-shadow">
                  {movie.title}
                </h3>
                <div className="flex items-center gap-2 text-[10px] md:text-[11px] text-[#E0E0E0] font-medium">
                  <span className="flex items-center gap-1 text-[#E0E0E0]">
                    <Clock size={11} className="text-[#9E9E9E]" />
                    {remainingText}
                  </span>
                  <span className="text-[#9E9E9E]">·</span>
                  <span className="text-[#9E9E9E]">{percentage}% watched</span>
                </div>
              </div>

              {/* Glowing Progress Bar across card bottom edge */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#FFFFFF] shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
