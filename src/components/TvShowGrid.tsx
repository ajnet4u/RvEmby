import React from 'react';
import { TvShow } from '../types';
import { motion } from 'motion/react';
import { Star, Tv, Layers, Play } from 'lucide-react';

interface TvShowGridProps {
  shows: TvShow[];
  viewMode: 'carousel' | 'grid';
  onSelectShow: (show: TvShow) => void;
  onHoverShow?: (show: TvShow | null) => void;
}

export function TvShowGrid({
  shows,
  viewMode,
  onSelectShow,
  onHoverShow
}: TvShowGridProps) {
  if (shows.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white/50">
        <Tv size={48} className="text-white/20 mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">No TV Series Found</h3>
        <p className="text-xs text-white/50 max-w-sm">
          Connect your Emby server to stream TV shows or check your library permissions.
        </p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 p-6 sm:p-10">
        {shows.map((show, index) => (
          <motion.div
            key={show.id}
            tabIndex={0}
            data-tv-focus="true"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.02, 0.4), duration: 0.3 }}
            className="group relative cursor-pointer outline-none focus:outline-none"
            onMouseEnter={() => onHoverShow && onHoverShow(show)}
            onMouseLeave={() => onHoverShow && onHoverShow(null)}
            onFocus={(e) => {
              if (onHoverShow) onHoverShow(show);
              e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectShow(show);
              }
            }}
            onClick={() => onSelectShow(show)}
          >
            {/* Poster Card */}
            <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-lg transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-[0_20px_35px_rgba(0,0,0,0.8)] group-hover:ring-4 ring-white group-focus:ring-4 group-focus:ring-cyan-400 group-focus:border-cyan-400 group-focus:-translate-y-2 group-focus:shadow-[0_0_35px_rgba(6,182,212,0.9)] relative border-2 border-transparent group-hover:border-white">
              {show.poster ? (
                <img 
                  src={show.poster} 
                  alt={show.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
              ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                  <Tv size={40} className="text-white/20" />
                </div>
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-end p-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-lg">
                  <Play fill="currentColor" size={14} className="ml-0.5" />
                </div>
              </div>

              {/* Seasons Count Badge */}
              {show.seasonsCount && (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-bold text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <Layers size={10} />
                  <span>{show.seasonsCount}S</span>
                </div>
              )}
            </div>

            {/* Title & Metadata */}
            <div className="mt-2.5">
              <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                {show.title}
              </h4>
              <div className="flex items-center gap-2 text-xs text-white/50 mt-0.5">
                {show.year && <span>{show.year}</span>}
                {show.rating && (
                  <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                    <Star size={11} fill="currentColor" />
                    {show.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // Horizontal Carousel Mode
  return (
    <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 md:px-16 overflow-hidden">
      <div className="flex gap-4 sm:gap-6 overflow-x-auto hide-scrollbar py-8 snap-x snap-mandatory">
        {shows.map((show, index) => (
          <motion.div
            key={show.id}
            tabIndex={0}
            data-tv-focus="true"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.3 }}
            className="shrink-0 group relative cursor-pointer snap-start outline-none focus:outline-none"
            onMouseEnter={() => onHoverShow && onHoverShow(show)}
            onMouseLeave={() => onHoverShow && onHoverShow(null)}
            onFocus={(e) => {
              if (onHoverShow) onHoverShow(show);
              e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectShow(show);
              }
            }}
            onClick={() => onSelectShow(show)}
          >
            <div className="w-48 sm:w-56 md:w-64 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 group-hover:-translate-y-3 group-hover:scale-105 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.9)] group-focus:scale-105 group-focus:-translate-y-3 group-focus:ring-4 group-focus:ring-cyan-400 group-focus:shadow-[0_0_35px_rgba(6,182,212,0.9)] border-2 border-white/10 group-hover:border-cyan-400 relative">
              {show.poster ? (
                <img 
                  src={show.poster} 
                  alt={show.title} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                  <Tv size={48} className="text-white/20" />
                </div>
              )}

              {/* Play Badge Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                <div className="w-14 h-14 rounded-full bg-cyan-500/90 text-black flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.8)]">
                  <Play fill="currentColor" size={24} className="ml-1" />
                </div>
              </div>

              {/* Seasons Count Badge */}
              {show.seasonsCount && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-xs font-bold text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <Layers size={12} />
                  <span>{show.seasonsCount} {show.seasonsCount === 1 ? 'Season' : 'Seasons'}</span>
                </div>
              )}
            </div>

            <div className="mt-3">
              <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors truncate max-w-[220px]">
                {show.title}
              </h4>
              <div className="flex items-center gap-3 text-xs text-white/50 mt-1">
                {show.year && <span>{show.year}</span>}
                {show.rating && (
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Star size={12} fill="currentColor" />
                    {show.rating.toFixed(1)}
                  </span>
                )}
                {show.status && (
                  <span className="text-emerald-400 font-medium">{show.status}</span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
