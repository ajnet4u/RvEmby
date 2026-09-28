import { Movie } from '../types';
import { motion } from 'motion/react';
import { Play, ChevronLeft, ChevronRight, LayoutGrid, Rows } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

interface MovieGridProps {
  title?: string;
  movies: Movie[];
  onHover: (movie: Movie | null) => void;
  onSelect: (movie: Movie) => void;
  viewMode?: 'carousel' | 'grid';
  onToggleViewMode?: () => void;
}

export function MovieGrid({ 
  title = "Movies", 
  movies, 
  onHover, 
  onSelect,
  viewMode = 'carousel',
  onToggleViewMode
}: MovieGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Check scroll bounds
  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [movies]);

  // Horizontal scroll by click
  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -Math.max(el.clientWidth * 0.65, 300) : Math.max(el.clientWidth * 0.65, 300);
    el.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 300);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight') {
        scroll('right');
      } else if (e.key === 'ArrowLeft') {
        scroll('left');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mouse wheel horizontal scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || viewMode === 'grid') return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        updateScrollButtons();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [viewMode]);

  return (
    <div className="w-full px-8 md:px-12 pb-4 relative group/carousel">
      {/* Header with Title, Count & View Mode Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-white/95 drop-shadow-md">
            {title}
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/20">
            {movies.length}
          </span>
        </div>

        {onToggleViewMode && (
          <button
            onClick={onToggleViewMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20 text-xs font-semibold transition-all backdrop-blur-md"
            title={viewMode === 'carousel' ? "Switch to Poster Wall Grid" : "Switch to Carousel"}
          >
            {viewMode === 'carousel' ? (
              <>
                <LayoutGrid size={15} />
                <span>Wall Grid</span>
              </>
            ) : (
              <>
                <Rows size={15} />
                <span>Carousel</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Grid Mode (Multi-row scrollable poster wall) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 md:gap-6 overflow-y-auto max-h-[70vh] pr-2 pb-16 custom-scrollbar">
          {movies.map((movie, index) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.02, 0.4), duration: 0.3 }}
              className="group relative cursor-pointer"
              onMouseEnter={() => onHover(movie)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(movie)}
            >
              <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-lg transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-[0_20px_35px_rgba(0,0,0,0.8)] group-hover:ring-4 ring-white relative border-2 border-transparent group-hover:border-white">
                {movie.poster ? (
                  <img 
                    src={movie.poster} 
                    alt={movie.title} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-400 p-3 text-center text-xs">
                    <span>{movie.title}</span>
                  </div>
                )}
                
                {movie.resolutionBadge && (
                  <div className="absolute top-1 right-1 bg-black/75 px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase backdrop-blur-sm border border-white/20">
                    {movie.resolutionBadge}
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/40 shadow-lg">
                    <Play size={20} fill="currentColor" className="ml-1" />
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs font-semibold text-white/90 truncate drop-shadow">{movie.title}</p>
              <p className="text-[10px] text-zinc-400">{movie.year || ''}</p>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Carousel Mode (Single horizontal row with left/right buttons) */
        <div className="relative">
          {/* Left Arrow Button */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute -left-5 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/80 hover:bg-white text-white hover:text-black border border-white/30 flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all duration-200"
              aria-label="Scroll Left"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {/* Right Arrow Button */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute -right-5 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/80 hover:bg-white text-white hover:text-black border border-white/30 flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all duration-200"
              aria-label="Scroll Right"
            >
              <ChevronRight size={28} />
            </button>
          )}

          <div 
            ref={scrollRef}
            onScroll={updateScrollButtons}
            className="flex gap-4 md:gap-6 overflow-x-auto pb-6 pt-2 hide-scrollbar scroll-smooth snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {movies.map((movie, index) => (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.3 }}
                className="shrink-0 group relative cursor-pointer snap-start"
                onMouseEnter={() => onHover(movie)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onSelect(movie)}
              >
                {/* Poster Container */}
                <div className="w-36 md:w-48 lg:w-56 aspect-[2/3] rounded-xl overflow-hidden shadow-lg transition-all duration-300 group-hover:-translate-y-4 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.7)] group-hover:ring-4 ring-white relative border-2 border-transparent group-hover:border-white">
                  {movie.poster ? (
                    <img 
                      src={movie.poster} 
                      alt={movie.title} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800/80 backdrop-blur flex items-center justify-center text-zinc-400 p-4 text-center border border-white/10">
                      <span className="text-sm font-medium">{movie.title}</span>
                    </div>
                  )}
                  
                  {/* Top Badge: 4K / UHD / Resolution */}
                  {movie.resolutionBadge && (
                    <div className="absolute top-1 right-1 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/20">
                      {movie.resolutionBadge}
                    </div>
                  )}
                  
                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)] transform scale-75 group-hover:scale-100 transition-transform duration-300 border border-white/40">
                      <Play className="text-white ml-1" fill="currentColor" size={24} />
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-xs font-semibold text-white/90 truncate w-36 md:w-48 lg:w-56 drop-shadow">
                  {movie.title}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

