import { Movie } from '../types';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import { useRef, useEffect } from 'react';

interface MovieGridProps {
  movies: Movie[];
  onHover: (movie: Movie | null) => void;
  onSelect: (movie: Movie) => void;
}

export function MovieGrid({ movies, onHover, onSelect }: MovieGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Enable horizontal scrolling with mouse wheel
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="w-full pl-12 pr-12 pb-4">
      <h2 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-white/90 mb-4 drop-shadow-md">
        Movies
      </h2>
      
      <div 
        ref={scrollRef}
        className="flex gap-4 md:gap-6 overflow-x-auto pb-6 pt-2 hide-scrollbar scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {movies.map((movie, index) => (
          <motion.div
            key={movie.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            className="shrink-0 group relative cursor-pointer snap-start"
            onMouseEnter={() => onHover(movie)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(movie)}
          >
            {/* Poster Container */}
            <div className="w-36 md:w-48 lg:w-56 aspect-[2/3] rounded-xl overflow-hidden shadow-lg transition-all duration-300 group-hover:-translate-y-4 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] group-hover:ring-4 ring-white relative border-2 border-transparent group-hover:border-white">
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
              
              {/* Top Banner on Hover (Format info like 4K ULTRA HD) - Mocked for visual effect */}
              {movie.contentRating && (
                <div className="absolute top-0 inset-x-0 bg-black/60 backdrop-blur-md py-1 px-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <span className="text-[10px] font-bold text-white">4K ULTRA HD</span>
                </div>
              )}
              
              {/* Play Overlay */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)] transform scale-75 group-hover:scale-100 transition-transform duration-300 border border-white/40">
                  <Play className="text-white ml-1" fill="currentColor" size={24} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
