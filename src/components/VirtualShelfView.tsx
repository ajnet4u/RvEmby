import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Info, 
  Star, 
  Clock, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Disc, 
  Sparkles,
  Library,
  Tv,
  RotateCcw
} from 'lucide-react';
import { Movie } from '../types';

interface VirtualShelfViewProps {
  movies: Movie[];
  onPlay: (movie: Movie, resumeSeconds?: number) => void;
  onSelectMovie: (movie: Movie) => void;
  title?: string;
  onBackToGrid?: () => void;
}

export function VirtualShelfView({
  movies,
  onPlay,
  onSelectMovie,
  title = "Physical Media Collection",
  onBackToGrid
}: VirtualShelfViewProps) {
  // Currently inspected/selected movie on the shelf
  const [activeMovie, setActiveMovie] = useState<Movie | null>(() => movies[0] || null);
  const [hoveredMovie, setHoveredMovie] = useState<Movie | null>(null);

  // Shelf horizontal scroll container ref
  const shelfScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Update active movie if movies list changes and active is not found
  useEffect(() => {
    if (movies.length > 0) {
      if (!activeMovie || !movies.some(m => m.id === activeMovie.id)) {
        setActiveMovie(movies[0]);
      }
    } else {
      setActiveMovie(null);
    }
  }, [movies, activeMovie]);

  // Check scroll boundary state
  const checkScrollBounds = () => {
    if (!shelfScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = shelfScrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScrollBounds();
    const ref = shelfScrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScrollBounds, { passive: true });
      window.addEventListener('resize', checkScrollBounds);
      return () => {
        ref.removeEventListener('scroll', checkScrollBounds);
        window.removeEventListener('resize', checkScrollBounds);
      };
    }
  }, [movies]);

  // Programmatic scroll step
  const scrollShelf = (direction: 'left' | 'right') => {
    if (!shelfScrollRef.current) return;
    const scrollAmount = shelfScrollRef.current.clientWidth * 0.65;
    shelfScrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  // Convert mouse wheel to horizontal shelf scroll
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (shelfScrollRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      shelfScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  // Format runtime helper (e.g. "2h 15m")
  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Keyboard navigation through physical spines
  const handleSpineKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' && index < movies.length - 1) {
      e.preventDefault();
      setActiveMovie(movies[index + 1]);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      setActiveMovie(movies[index - 1]);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (activeMovie) {
        onPlay(activeMovie, activeMovie.playbackPositionSeconds || 0);
      }
    }
  };

  // The inspected movie is prioritized by hover, then by active selection
  const displayedMovie = hoveredMovie || activeMovie;

  return (
    <div className="flex-1 w-full h-full flex flex-col md:flex-row overflow-hidden bg-[#070709] select-none text-[#E0E0E0] relative">
      {/* Dynamic Ambient Room Backdrop Glow from active movie */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <AnimatePresence mode="wait">
          {displayedMovie?.backdrop && (
            <motion.div
              key={displayedMovie.id}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 0.18, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="absolute inset-0 bg-cover bg-center filter blur-3xl"
              style={{ backgroundImage: `url(${displayedMovie.backdrop})` }}
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        <div className="absolute inset-0 bg-radial-at-c from-transparent via-black/70 to-black" />
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: THE PHYSICAL SHELF (~65% - 70% Width)                         */}
      {/* ========================================================================= */}
      <div className="flex-[7] lg:flex-[68] flex flex-col justify-between relative z-10 p-6 md:p-8 lg:p-10 overflow-hidden border-b md:border-b-0 md:border-r border-white/[0.06]">
        
        {/* Shelf Header & Navigation Bar */}
        <div className="flex items-center justify-between gap-4 mb-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/[0.06] border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] text-amber-300">
              <Library size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2 font-['Inter',sans-serif]">
                  <span>{title}</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-white/80 border border-white/10">
                  {movies.length} Discs
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 hidden sm:block">
                Curated physical Blu-ray & 4K Ultra HD editions. Select a spine to inspect case.
              </p>
            </div>
          </div>

          {/* Action Tools & Scroll Controls */}
          <div className="flex items-center gap-2">
            {onBackToGrid && (
              <button
                onClick={onBackToGrid}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-neutral-300 hover:text-white border border-white/[0.08] transition-all cursor-pointer cinema-focus"
                title="Return to standard Poster Grid"
              >
                <span>Grid View</span>
              </button>
            )}

            {/* Shelf Scroll Arrows */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 backdrop-blur-md">
              <button
                onClick={() => scrollShelf('left')}
                disabled={!canScrollLeft}
                className={`p-1.5 rounded-lg transition-all ${
                  canScrollLeft 
                    ? 'hover:bg-white/10 text-white cursor-pointer active:scale-95' 
                    : 'text-neutral-600 opacity-40 cursor-not-allowed'
                }`}
                title="Scroll Shelf Left"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => scrollShelf('right')}
                disabled={!canScrollRight}
                className={`p-1.5 rounded-lg transition-all ${
                  canScrollRight 
                    ? 'hover:bg-white/10 text-white cursor-pointer active:scale-95' 
                    : 'text-neutral-600 opacity-40 cursor-not-allowed'
                }`}
                title="Scroll Shelf Right"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Shelf Empty State Fallback */}
        {movies.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500 mb-3">
              <Library size={28} />
            </div>
            <h3 className="text-base font-semibold text-white">Shelf is currently empty</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm">
              Connect to your Emby/Jellyfin server or add movies to your library to populate the physical media shelf.
            </p>
          </div>
        ) : (
          /* The Physical Media Bookshelf Area */
          <div className="flex-1 flex flex-col justify-end relative my-auto min-h-[380px] sm:min-h-[420px] md:min-h-[460px]">
            
            {/* Shelf Backing Ambient Shadow & Wall Panel */}
            <div className="absolute inset-x-0 bottom-4 top-10 rounded-2xl bg-gradient-to-b from-[#101014]/60 via-[#0a0a0c]/80 to-[#050507] border border-white/[0.04] shadow-inner pointer-events-none" />

            {/* Scrollable Horizontal Spine Container */}
            <div
              ref={shelfScrollRef}
              onWheel={handleWheel}
              className="flex items-end gap-1.5 sm:gap-2 px-6 sm:px-10 pb-4 overflow-x-auto scroll-smooth hide-scrollbar relative z-10 focus:outline-none"
              tabIndex={0}
              role="region"
              aria-label="Physical Media Spines"
            >
              {/* Left Shelf Bookend (Cast Iron / Brushed Metallic Stand) */}
              <div 
                className="shrink-0 w-4 sm:w-5 h-[320px] sm:h-[350px] md:h-[370px] rounded-l-md bg-gradient-to-r from-[#202025] to-[#141418] border-y border-l border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center relative pointer-events-none"
                aria-hidden="true"
              >
                <div className="w-0.5 h-3/4 bg-white/10 rounded-full" />
              </div>

              {/* Movie Spines Map */}
              {movies.map((movie, index) => {
                const isSelected = activeMovie?.id === movie.id;
                const isHovered = hoveredMovie?.id === movie.id;
                const is4K = movie.resolutionBadge === '4K' || movie.videoUrl?.includes('4k');
                const isHDR = !!movie.hdrBadge;

                return (
                  <button
                    key={movie.id}
                    data-tv-focus="true"
                    type="button"
                    onClick={() => setActiveMovie(movie)}
                    onMouseEnter={() => setHoveredMovie(movie)}
                    onMouseLeave={() => setHoveredMovie(null)}
                    onFocus={() => {
                      setActiveMovie(movie);
                      setHoveredMovie(movie);
                    }}
                    onBlur={() => setHoveredMovie(null)}
                    onKeyDown={(e) => handleSpineKeyDown(e, index)}
                    aria-label={`${movie.title} (${movie.year || 'Movie'}) Blu-ray case`}
                    className={`relative shrink-0 w-[48px] sm:w-[54px] md:w-[60px] h-[320px] sm:h-[350px] md:h-[370px] rounded-[4px] cursor-pointer outline-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none text-left font-sans group ${
                      isSelected
                        ? '-translate-y-6 sm:-translate-y-7 scale-[1.04] z-30 ring-2 ring-amber-300/80 shadow-[-10px_30px_45px_rgba(0,0,0,0.95),0_0_24px_rgba(245,158,11,0.3)]'
                        : isHovered
                          ? '-translate-y-4 sm:-translate-y-5 scale-[1.02] z-20 shadow-[-8px_25px_35px_rgba(0,0,0,0.9),0_0_16px_rgba(255,255,255,0.15)] ring-1 ring-white/40'
                          : 'translate-y-0 scale-100 shadow-[-4px_10px_20px_rgba(0,0,0,0.7)] hover:shadow-[-6px_18px_28px_rgba(0,0,0,0.85)]'
                    }`}
                  >
                    {/* Spine Construction Container with Hidden Overflow */}
                    <div className="absolute inset-0 rounded-[4px] overflow-hidden flex flex-col justify-between p-2.5 z-10 bg-neutral-900 border border-white/[0.12]">
                      
                      {/* Synthesized Spine Background: Blurring movie poster palette */}
                      {movie.poster ? (
                        <div 
                          className="absolute inset-0 bg-cover bg-center scale-[3.5] filter blur-[14px] saturate-[1.5] brightness-[0.45] pointer-events-none transform-gpu"
                          style={{ backgroundImage: `url(${movie.poster})` }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-b from-neutral-800 via-neutral-900 to-black pointer-events-none" />
                      )}

                      {/* Textured Plastic Case Spine Overlays & Gloss Highlight */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-black/60 pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/75 pointer-events-none" />
                      
                      {/* Spine Plastic Hinge Groove (Left & Right simulated bevels) */}
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white/20 shadow-[1px_0_2px_rgba(255,255,255,0.2)] pointer-events-none" />
                      <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-black/70 shadow-[-1px_0_2px_rgba(0,0,0,0.8)] pointer-events-none" />

                      {/* Top Header of Spine: Physical Disc Format Badge */}
                      <div className="relative z-20 flex flex-col items-center justify-center shrink-0 pt-0.5">
                        {is4K ? (
                          <div className="px-1 py-0.5 rounded-[2px] bg-black/80 border border-amber-400/50 shadow-sm flex flex-col items-center">
                            <span className="text-[7px] font-black text-amber-300 font-mono tracking-tighter leading-none">
                              4K UHD
                            </span>
                            <span className="text-[5px] text-white/70 font-mono tracking-widest leading-none mt-0.5">
                              BLU-RAY
                            </span>
                          </div>
                        ) : (
                          <div className="px-1 py-0.5 rounded-[2px] bg-black/70 border border-sky-400/40 shadow-sm flex flex-col items-center">
                            <span className="text-[7px] font-black text-sky-300 font-mono tracking-tighter leading-none">
                              BD-ROM
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Center of Spine: Movie Title Rendered Vertically */}
                      <div className="relative z-20 flex-1 flex items-center justify-center overflow-hidden my-2">
                        <span 
                          style={{
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)'
                          }}
                          className={`font-bold tracking-wider uppercase text-white font-['Inter',sans-serif] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] max-h-[220px] sm:max-h-[240px] truncate select-none transition-colors ${
                            isSelected 
                              ? 'text-amber-200 text-xs sm:text-[13px] font-extrabold tracking-widest' 
                              : 'text-white/90 text-[11px] sm:text-xs group-hover:text-white'
                          }`}
                        >
                          {movie.title}
                        </span>
                      </div>

                      {/* Bottom Footer of Spine: Audio Format & Year */}
                      <div className="relative z-20 flex flex-col items-center justify-center gap-1 shrink-0 pb-0.5">
                        {/* Audio / HDR Badge */}
                        {isHDR && (
                          <span className="text-[7px] font-mono font-bold px-1 rounded bg-black/60 text-white/80 border border-white/10 uppercase">
                            HDR
                          </span>
                        )}

                        {/* Release Year */}
                        {movie.year && (
                          <span className="font-mono text-[9px] text-white/60 tracking-wider">
                            {movie.year}
                          </span>
                        )}

                        {/* Miniature Disc Icon */}
                        <Disc size={10} className={isSelected ? 'text-amber-300 animate-spin' : 'text-white/40'} />
                      </div>
                    </div>

                    {/* Physical Shadow Cast onto Shelf Surface Below Spine */}
                    <div 
                      className={`absolute -bottom-2 inset-x-1 h-3 rounded-full bg-black/80 blur-[3px] transition-all duration-300 pointer-events-none ${
                        isSelected ? 'scale-x-90 opacity-90' : 'scale-x-100 opacity-60'
                      }`} 
                    />
                  </button>
                );
              })}

              {/* Right Shelf Bookend */}
              <div 
                className="shrink-0 w-4 sm:w-5 h-[320px] sm:h-[350px] md:h-[370px] rounded-r-md bg-gradient-to-l from-[#202025] to-[#141418] border-y border-r border-white/10 shadow-[-4px_0_12px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center relative pointer-events-none"
                aria-hidden="true"
              >
                <div className="w-0.5 h-3/4 bg-white/10 rounded-full" />
              </div>
            </div>

            {/* =============================================================== */}
            {/* PHYSICAL SHELF SURFACE (Solid Ledge, Walnut Texture & Bevel)     */}
            {/* =============================================================== */}
            <div className="relative w-full z-20 pointer-events-none select-none">
              {/* Top Surface Plank of the Shelf (Subtle Wood/Charcoal Reflection) */}
              <div className="h-3 w-full bg-gradient-to-r from-[#201712] via-[#2c2019] to-[#1f1611] border-t border-[#4f3a2c]/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.06)]" />

              {/* Front Beveled Edge of the Wooden Shelf */}
              <div className="h-5 sm:h-6 w-full bg-gradient-to-b from-[#1e1510] via-[#140e0a] to-[#090605] border-t border-[#3b2a1f] border-b border-black shadow-[0_18px_30px_rgba(0,0,0,0.95)] flex items-center justify-between px-6">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#695241]/70 font-semibold">
                  HEAVY TIMBER SHELF NO. 01
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#695241]/70 font-semibold">
                  4K UHD / BLU-RAY VAULT
                </span>
              </div>

              {/* Deep Drop Shadow Cast below the Shelf onto floor/lower section */}
              <div className="h-6 w-full bg-gradient-to-b from-black/80 to-transparent" />
            </div>

          </div>
        )}

        {/* Shelf Quick Navigation Hints Legend */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[11px] text-neutral-400 font-mono">
          <div className="flex items-center gap-4 flex-wrap">
            <span><kbd className="text-white font-bold bg-white/10 px-1.5 py-0.5 rounded">← / →</kbd> Browse Spines</span>
            <span><kbd className="text-white font-bold bg-white/10 px-1.5 py-0.5 rounded">Enter</kbd> Play Active Disc</span>
            <span><kbd className="text-white font-bold bg-white/10 px-1.5 py-0.5 rounded">Click</kbd> Inspect Case</span>
          </div>
          <span className="hidden sm:inline text-neutral-500">
            {activeMovie ? `Active: ${activeMovie.title}` : 'No disc selected'}
          </span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: THE DETAILS PANEL (Right Side ~30% - 35% Width)                 */}
      {/* ========================================================================= */}
      <div className="flex-[3] lg:flex-[32] bg-[#0c0c10]/95 backdrop-blur-2xl p-6 sm:p-7 md:p-8 flex flex-col justify-between overflow-y-auto relative z-20 shadow-[-20px_0_50px_rgba(0,0,0,0.9)]">
        
        {activeMovie ? (
          <motion.div
            key={activeMovie.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex-1 flex flex-col justify-between"
          >
            {/* Top Container: Cover Art Showcase & Primary Metadata */}
            <div>
              {/* Full Uncropped Primary Poster Showcase */}
              <div className="relative group/poster mx-auto max-w-[240px] sm:max-w-[260px] md:max-w-[280px] mb-5">
                {/* Ambient Soft Glow Behind Cover Art */}
                {activeMovie.poster && (
                  <div 
                    className="absolute -inset-2 bg-cover bg-center rounded-2xl filter blur-xl opacity-40 group-hover/poster:opacity-60 transition-opacity pointer-events-none -z-10"
                    style={{ backgroundImage: `url(${activeMovie.poster})` }}
                  />
                )}

                {/* The Uncropped Poster with Physical Box Chamfer */}
                <div className="relative rounded-xl overflow-hidden border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.95)] aspect-[2/3] bg-neutral-900">
                  {activeMovie.poster ? (
                    <img 
                      src={activeMovie.poster} 
                      alt={activeMovie.title} 
                      className="w-full h-full object-cover select-none"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-neutral-800 text-neutral-400">
                      <Disc size={36} className="mb-2 text-neutral-500 animate-pulse" />
                      <span className="text-sm font-semibold">{activeMovie.title}</span>
                    </div>
                  )}

                  {/* Physical Plastic Case Highlights Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/15 pointer-events-none" />
                  
                  {/* Resolution & HDR Badges Overlay */}
                  <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end pointer-events-none">
                    {activeMovie.resolutionBadge && (
                      <span className="px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-md text-[10px] font-mono font-bold text-amber-300 border border-amber-400/40 shadow-lg">
                        {activeMovie.resolutionBadge}
                      </span>
                    )}
                    {activeMovie.hdrBadge && (
                      <span className="px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-md text-[10px] font-mono font-bold text-sky-300 border border-sky-400/40 shadow-lg">
                        {activeMovie.hdrBadge}
                      </span>
                    )}
                  </div>

                  {/* Watched / In Progress Badge */}
                  {activeMovie.playbackPercentage && activeMovie.playbackPercentage > 0 && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/85 backdrop-blur-md p-2 flex items-center gap-2 border-t border-white/10">
                      <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
                        <div 
                          className="h-full bg-amber-400"
                          style={{ width: `${Math.min(100, activeMovie.playbackPercentage)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[9px] text-amber-300 font-bold shrink-0">
                        {Math.round(activeMovie.playbackPercentage)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Metadata Details */}
              <div className="space-y-2 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  {activeMovie.genres && activeMovie.genres.length > 0 && (
                    <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider font-mono">
                      {activeMovie.genres.slice(0, 2).join(' · ')}
                    </span>
                  )}
                  {activeMovie.contentRating && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-white/20 text-white/80">
                      {activeMovie.contentRating}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight cinema-title">
                  {activeMovie.title}
                </h2>

                {/* Year, Runtime, Rating Matrix */}
                <div className="flex items-center gap-3 text-xs text-neutral-400 font-medium pt-1">
                  {activeMovie.year && (
                    <div className="flex items-center gap-1">
                      <Calendar size={13} className="text-neutral-500" />
                      <span>{activeMovie.year}</span>
                    </div>
                  )}

                  {activeMovie.runtime && (
                    <div className="flex items-center gap-1">
                      <Clock size={13} className="text-neutral-500" />
                      <span>{formatDuration(activeMovie.runtime)}</span>
                    </div>
                  )}

                  {activeMovie.rating && (
                    <div className="flex items-center gap-1 text-amber-300">
                      <Star size={13} className="fill-amber-400 text-amber-400" />
                      <span className="font-bold text-white">{activeMovie.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* Overview Text */}
                {activeMovie.overview ? (
                  <p className="text-xs sm:text-sm text-neutral-300/90 leading-relaxed pt-2 line-clamp-4 lg:line-clamp-5">
                    {activeMovie.overview}
                  </p>
                ) : (
                  <p className="text-xs text-neutral-500 italic pt-2">
                    No synopsis available for this disc.
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Actions: Play Now & View Details Buttons */}
            <div className="space-y-2.5 pt-6 mt-4 border-t border-white/[0.08]">
              {/* Play Now / Resume Button */}
              <button
                data-tv-focus="true"
                onClick={() => onPlay(activeMovie, activeMovie.playbackPositionSeconds || 0)}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-white/90 text-black font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:shadow-[0_0_35px_rgba(255,255,255,0.4)] active:scale-[0.98] transition-all cursor-pointer cinema-focus"
              >
                {activeMovie.playbackPositionSeconds && activeMovie.playbackPositionSeconds > 0 ? (
                  <>
                    <RotateCcw size={17} className="text-black" />
                    <span>Resume ({formatDuration(Math.round(activeMovie.playbackPositionSeconds / 60))})</span>
                  </>
                ) : (
                  <>
                    <Play size={17} className="fill-black" />
                    <span>Play Now</span>
                  </>
                )}
              </button>

              {/* View Details Button */}
              <button
                data-tv-focus="true"
                onClick={() => onSelectMovie(activeMovie)}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/10 active:scale-[0.98] transition-all cursor-pointer cinema-focus backdrop-blur-md"
              >
                <Info size={15} />
                <span>View Details & Cast</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* Subtle Placeholder State when no movie is active */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-500">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3 text-neutral-600">
              <Disc size={28} />
            </div>
            <h3 className="text-sm font-semibold text-neutral-400">Select a movie from the shelf</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-[200px]">
              Click or hover over any physical spine on the left to reveal cover art and playback options.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
