import { X } from 'lucide-react';
import { Movie } from '../types';

interface VideoPlayerProps {
  movie: Movie | null;
  onClose: () => void;
}

export function VideoPlayer({ movie, onClose }: VideoPlayerProps) {
  if (!movie || !movie.videoUrl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="absolute top-6 right-6 z-10">
        <button 
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-black/50 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur-md transition-colors"
        >
          <X size={24} />
        </button>
      </div>
      
      <video 
        src={movie.videoUrl} 
        autoPlay 
        controls 
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
