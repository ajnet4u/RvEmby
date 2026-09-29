import { Movie, SortField, SortDirection } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  LayoutGrid, 
  Rows, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Calendar, 
  Star, 
  Type, 
  ChevronDown,
  Search
} from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

interface MovieGridProps {
  title?: string;
  movies: Movie[];
  onHover: (movie: Movie | null) => void;
  onSelect: (movie: Movie) => void;
  viewMode?: 'carousel' | 'grid';
  onToggleViewMode?: () => void;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSortChange?: (field: SortField, direction: SortDirection) => void;
  showSortControls?: boolean;
}

export function MovieGrid({ 
  title = "Movies", 
  movies, 
  onHover, 
  onSelect,
  viewMode = 'carousel',
  onToggleViewMode,
  sortField = 'title',
  sortDirection = 'asc',
  onSortChange,
  showSortControls = true
}: MovieGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    }
    if (isSortDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSortDropdownOpen]);

  // Handle Sort button click
  const handleSortClick = (field: SortField) => {
    if (!onSortChange) return;
    if (sortField === field) {
      onSortChange(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      const defaultDir: SortDirection = field === 'title' ? 'asc' : 'desc';
      onSortChange(field, defaultDir);
    }
  };

  const sortOptions: { field: SortField; direction: SortDirection; label: string; icon: any }[] = [
    { field: 'title', direction: 'asc', label: 'Title: A to Z', icon: Type },
    { field: 'title', direction: 'desc', label: 'Title: Z to A', icon: Type },
    { field: 'year', direction: 'desc', label: 'Release Date: Newest First', icon: Calendar },
    { field: 'year', direction: 'asc', label: 'Release Date: Oldest First', icon: Calendar },
    { field: 'rating', direction: 'desc', label: 'Rating: Highest First (★)', icon: Star },
    { field: 'rating', direction: 'asc', label: 'Rating: Lowest First', icon: Star },
  ];

  const currentSortLabel = () => {
    if (sortField === 'title') {
      return sortDirection === 'asc' ? 'Title (A–Z)' : 'Title (Z–A)';
    }
    if (sortField === 'year') {
      return sortDirection === 'desc' ? 'Newest Release' : 'Oldest Release';
    }
    if (sortField === 'rating') {
      return sortDirection === 'desc' ? 'Highest Rating' : 'Lowest Rating';
    }
    return 'Default Sort';
  };

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
      } else if (e.key === 'Escape') {
        setIsSortDropdownOpen(false);
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
      {/* Header with Title, Count, Sort Controls & View Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Left: Title & Count */}
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-white/95 drop-shadow-md">
            {title}
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/20">
            {movies.length}
          </span>
        </div>

        {/* Right: Sort Controls & View Mode Toggle */}
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          {showSortControls && onSortChange && (
            <div className="flex items-center gap-2">
              {/* Button set for fast 1-click sorting */}
              <div className="hidden sm:flex items-center bg-white/10 rounded-xl p-0.5 border border-white/15 backdrop-blur-md">
                {/* Title Sort Button */}
                <button
                  onClick={() => handleSortClick('title')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    sortField === 'title' 
                      ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  title={sortField === 'title' ? `Title: ${sortDirection.toUpperCase()} (Click to invert)` : "Sort by Title"}
                >
                  <Type size={13} />
                  <span>Title</span>
                  {sortField === 'title' && (
                    sortDirection === 'asc' ? <ArrowUp size={12} strokeWidth={2.5} /> : <ArrowDown size={12} strokeWidth={2.5} />
                  )}
                </button>

                {/* Release Date Sort Button */}
                <button
                  onClick={() => handleSortClick('year')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    sortField === 'year' 
                      ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  title={sortField === 'year' ? `Release Date: ${sortDirection === 'desc' ? 'Newest' : 'Oldest'} (Click to invert)` : "Sort by Release Date"}
                >
                  <Calendar size={13} />
                  <span>Release Date</span>
                  {sortField === 'year' && (
                    sortDirection === 'desc' ? <ArrowDown size={12} strokeWidth={2.5} /> : <ArrowUp size={12} strokeWidth={2.5} />
                  )}
                </button>

                {/* Rating Sort Button */}
                <button
                  onClick={() => handleSortClick('rating')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    sortField === 'rating' 
                      ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  title={sortField === 'rating' ? `Rating: ${sortDirection === 'desc' ? 'Highest' : 'Lowest'} (Click to invert)` : "Sort by Rating"}
                >
                  <Star size={13} className={sortField === 'rating' ? 'fill-black' : ''} />
                  <span>Rating</span>
                  {sortField === 'rating' && (
                    sortDirection === 'desc' ? <ArrowDown size={12} strokeWidth={2.5} /> : <ArrowUp size={12} strokeWidth={2.5} />
                  )}
                </button>
              </div>

              {/* Dropdown Menu for exact sorting options */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border border-white/20 text-xs font-semibold transition-all backdrop-blur-md shadow-sm"
                  title="Open sort options menu"
                >
                  <ArrowUpDown size={14} className="text-cyan-400" />
                  <span className="hidden sm:inline text-white/50 text-[11px] font-normal">Sort:</span>
                  <span className="text-white">{currentSortLabel()}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu Popup */}
                <AnimatePresence>
                  {isSortDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-60 rounded-2xl bg-zinc-900/95 border border-zinc-700/80 shadow-[0_15px_35px_rgba(0,0,0,0.8)] p-2 z-50 backdrop-blur-xl"
                    >
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/80 mb-1 flex items-center justify-between">
                        <span>Sort Movies By</span>
                        <span className="text-cyan-400">{movies.length} items</span>
                      </div>

                      <div className="space-y-0.5">
                        {sortOptions.map((opt, i) => {
                          const isSelected = sortField === opt.field && sortDirection === opt.direction;
                          const Icon = opt.icon;
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                onSortChange(opt.field, opt.direction);
                                setIsSortDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                                isSelected 
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold' 
                                  : 'text-zinc-300 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Icon size={14} className={isSelected ? 'text-cyan-400' : 'text-zinc-400'} />
                                <span>{opt.label}</span>
                              </div>
                              {isSelected && <Check size={14} className="text-cyan-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* View Mode Toggle (Wall Grid vs Carousel) */}
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
      </div>


      {/* Empty State */}
      {movies.length === 0 ? (
        <div className="py-14 flex flex-col items-center justify-center text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 mb-3 shadow-lg">
            <Search size={24} />
          </div>
          <h3 className="text-base font-semibold text-white/90">No movies found</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm">
            No titles match your current search or filter criteria. Try searching for a different keyword.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Mode (Multi-row scrollable poster wall) */
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 md:gap-6 overflow-y-auto max-h-[70vh] pr-2 pb-16 custom-scrollbar">
          {movies.map((movie, index) => (
            <motion.div
              key={movie.id}
              tabIndex={0}
              data-tv-focus="true"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.02, 0.4), duration: 0.3 }}
              className="group relative cursor-pointer outline-none focus:outline-none"
              onMouseEnter={() => onHover(movie)}
              onMouseLeave={() => onHover(null)}
              onFocus={(e) => {
                onHover(movie);
                e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }}
              onBlur={() => onHover(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(movie);
                }
              }}
              onClick={() => onSelect(movie)}
            >
              <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-lg transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-[0_20px_35px_rgba(0,0,0,0.8)] group-hover:ring-4 ring-white group-focus:ring-4 group-focus:ring-cyan-400 group-focus:border-cyan-400 group-focus:-translate-y-2 group-focus:shadow-[0_0_35px_rgba(6,182,212,0.9)] relative border-2 border-transparent group-hover:border-white">
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

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/40 shadow-lg">
                    <Play size={20} fill="currentColor" className="ml-1" />
                  </div>
                </div>

                {/* Progress bar for in-progress movies */}
                {movie.playbackPercentage && movie.playbackPercentage > 0 ? (
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/70 overflow-hidden">
                    <div 
                      className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)]" 
                      style={{ width: `${movie.playbackPercentage}%` }} 
                    />
                  </div>
                ) : null}
              </div>
              <p className="mt-2 text-xs font-semibold text-white/90 truncate drop-shadow group-focus:text-cyan-300">{movie.title}</p>
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
                tabIndex={0}
                data-tv-focus="true"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.3 }}
                className="shrink-0 group relative cursor-pointer snap-start outline-none focus:outline-none"
                onMouseEnter={() => onHover(movie)}
                onMouseLeave={() => onHover(null)}
                onFocus={(e) => {
                  onHover(movie);
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                onBlur={() => onHover(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(movie);
                  }
                }}
                onClick={() => onSelect(movie)}
              >
                {/* Poster Container */}
                <div className="w-36 md:w-48 lg:w-56 aspect-[2/3] rounded-xl overflow-hidden shadow-lg transition-all duration-300 group-hover:-translate-y-4 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.7)] group-hover:ring-4 ring-white group-focus:ring-4 group-focus:ring-cyan-400 group-focus:border-cyan-400 group-focus:-translate-y-4 group-focus:shadow-[0_0_35px_rgba(6,182,212,0.9)] relative border-2 border-transparent group-hover:border-white">
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
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)] transform scale-75 group-hover:scale-100 group-focus:scale-100 transition-transform duration-300 border border-white/40">
                      <Play className="text-white ml-1" fill="currentColor" size={24} />
                    </div>
                  </div>

                  {/* Progress bar for in-progress movies */}
                  {movie.playbackPercentage && movie.playbackPercentage > 0 ? (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/70 overflow-hidden">
                      <div 
                        className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)]" 
                        style={{ width: `${movie.playbackPercentage}%` }} 
                      />
                    </div>
                  ) : null}
                </div>

                <p className="mt-2 text-xs font-semibold text-white/90 truncate w-36 md:w-48 lg:w-56 drop-shadow group-focus:text-cyan-300">
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

