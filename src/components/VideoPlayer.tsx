import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Movie } from '../types';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  MessageSquare, 
  Music, 
  X,
  Clock,
  Sparkles,
  ChevronRight,
  Check,
  ArrowLeft
} from 'lucide-react';

interface VideoPlayerProps {
  movie: Movie | null;
  onClose: () => void;
}

export function VideoPlayer({ movie, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isHoveringTimeline, setIsHoveringTimeline] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);

  // Subtitle & Audio tracks menu
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState(0);
  const [selectedSub, setSelectedSub] = useState<number | null>(null);

  // Live system clock for JEmby header
  const [clockString, setClockString] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockString(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 10000);
    return () => clearInterval(interval);
  }, []);

  // Format seconds to HH:MM:SS or MM:SS
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Auto-hide controls timer
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        if (!showAudioMenu && !showSubMenu) {
          setShowControls(false);
        }
      }, 3500);
    }
  }, [isPlaying, showAudioMenu, showSubMenu]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [resetControlsTimer]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(true);
    }
  };

  const seek = (amount: number) => {
    if (!videoRef.current) return;
    const target = Math.max(0, Math.min(duration, videoRef.current.currentTime + amount));
    videoRef.current.currentTime = target;
    setCurrentTime(target);
    resetControlsTimer();
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !videoRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = pos * duration;
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
    resetControlsTimer();
  };

  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVol;
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
    resetControlsTimer();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard controls mapped for remote and media playback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      resetControlsTimer();
      switch (e.key) {
        case ' ':
        case 'Enter':
        case 'MediaPlayPause':
        case 'MediaPlay':
        case 'MediaPause':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'MediaRewind':
          e.preventDefault();
          seek(-10);
          break;
        case 'ArrowRight':
        case 'MediaFastForward':
          e.preventDefault();
          seek(10);
          break;
        case 'MediaTrackPrevious':
          e.preventDefault();
          seek(-30);
          break;
        case 'MediaTrackNext':
          e.preventDefault();
          seek(30);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'Escape':
        case 'Backspace':
          onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, isMuted, duration, isPlaying, onClose, resetControlsTimer]);

  if (!movie || !movie.videoUrl) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const remainingTime = duration > 0 ? duration - currentTime : 0;

  // Mocked/Actual Audio Tracks
  const audioTracks = movie.audioTracks && movie.audioTracks.length > 0 
    ? movie.audioTracks 
    : [
        { lang: 'English', format: 'Dolby Digital 5.1' },
        { lang: 'French (VFF)', format: 'Dolby Atmos' },
        { lang: 'English', format: 'Stereo AAC' }
      ];

  // Mocked/Actual Subtitles
  const subtitles = movie.subtitles && movie.subtitles.length > 0
    ? movie.subtitles
    : ['Off', 'English [CC]', 'French (Français)', 'Spanish (Español)'];

  return (
    <div 
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
      className={`fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden font-sans text-white ${
        !showControls && isPlaying ? 'cursor-none' : 'cursor-default'
      }`}
    >
      {/* Video Element */}
      <video 
        ref={videoRef}
        src={movie.videoUrl} 
        autoPlay 
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
      />

      {/* JEmby HUD Overlay (Smooth Fade) */}
      <div className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 pointer-events-none ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        
        {/* JEmby Top Bar: Ambient Dark Gradient + Cinema Title & Badges */}
        <div className="w-full bg-gradient-to-b from-black/90 via-black/60 to-transparent pt-6 pb-12 px-10 md:px-14 flex items-start justify-between pointer-events-auto">
          {/* Left Title Info */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-black tracking-widest text-cyan-400 uppercase flex items-center gap-1.5 drop-shadow">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
                JEmby Player
              </span>
              {movie.resolutionBadge && (
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-white/15 border border-white/20 uppercase tracking-widest text-white/90">
                  {movie.resolutionBadge}
                </span>
              )}
              {movie.contentRating && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 border border-white/20 text-white/80">
                  {movie.contentRating}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              {movie.title}
            </h1>

            <div className="flex items-center gap-3 text-xs text-white/70 font-medium">
              {movie.year && <span>{movie.year}</span>}
              <span>•</span>
              <span>{movie.genres?.slice(0, 2).join(' / ') || 'Feature Film'}</span>
              <span>•</span>
              <span className="text-cyan-300 font-mono font-semibold">
                {audioTracks[selectedAudio]?.format || 'Dolby Audio 5.1'}
              </span>
            </div>
          </div>

          {/* Right Clock & Back Prompt */}
          <div className="flex items-center gap-5">
            {/* Live Clock */}
            <div className="flex items-center gap-2 text-white/80 font-mono text-sm tracking-widest">
              <Clock size={16} className="text-cyan-400" />
              <span>{clockString}</span>
            </div>

            {/* Back Button */}
            <button 
              onClick={onClose}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all shadow-lg group backdrop-blur-md cursor-pointer"
              title="Close player (Esc / Back)"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="tracking-wider">BACK</span>
              <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/20 text-[9px] font-mono text-white/70">ESC</kbd>
            </button>
          </div>
        </div>

        {/* JEmby Bottom Bar: Glowing Timeline + Cinema Controls */}
        <div className="w-full bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-14 pb-5 px-10 md:px-14 flex flex-col gap-4 pointer-events-auto">
          
          {/* Cyan Scrubber Timeline */}
          <div className="flex items-center gap-4 text-xs font-mono font-semibold text-white/80">
            {/* Current Time */}
            <span className="w-16 text-right tabular-nums text-cyan-300 drop-shadow">
              {formatTime(currentTime)}
            </span>

            {/* Interactive Timeline Bar */}
            <div 
              ref={timelineRef}
              onClick={handleTimelineClick}
              onMouseEnter={() => setIsHoveringTimeline(true)}
              onMouseLeave={() => setIsHoveringTimeline(false)}
              onMouseMove={handleTimelineMouseMove}
              className="relative flex-1 h-3 flex items-center cursor-pointer group"
            >
              {/* Background Track */}
              <div className="w-full h-1.5 rounded-full bg-zinc-800/90 border border-white/10 overflow-hidden relative group-hover:h-2 transition-all">
                {/* Glowing Cyan Filled Progress */}
                <div 
                  className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-blue-500 shadow-[0_0_12px_rgba(6,182,212,0.9)] relative"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Circular Scrubber Thumb */}
              <div 
                className="absolute w-4 h-4 rounded-full bg-white border-2 border-cyan-400 shadow-[0_0_15px_#22d3ee] -translate-x-1/2 transform scale-75 group-hover:scale-110 transition-transform pointer-events-none"
                style={{ left: `${progressPercent}%` }}
              />

              {/* Hover Tooltip Timestamp */}
              {isHoveringTimeline && hoverTime !== null && (
                <div 
                  className="absolute bottom-6 -translate-x-1/2 px-2.5 py-1 rounded-md bg-zinc-900 border border-cyan-500 text-[11px] font-mono text-cyan-300 shadow-xl pointer-events-none backdrop-blur-md"
                  style={{ left: `${hoverPosition}%` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>

            {/* Remaining & Total Duration */}
            <div className="flex items-center gap-1.5 w-28 tabular-nums text-white/60">
              <span className="text-white/90">-{formatTime(remainingTime)}</span>
            </div>
          </div>

          {/* JEmby Playback Control Center (Buttons Row) */}
          <div className="flex items-center justify-between pt-1">
            {/* Left Controls: Volume & Status */}
            <div className="flex items-center gap-3 w-1/4">
              <button 
                onClick={toggleMute}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-all backdrop-blur-md"
                title="Mute / Unmute (M)"
              >
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              
              <input 
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-24 accent-[#0072ce] cursor-pointer"
                title="Volume"
              />
            </div>

            {/* Center Controls: JEmby Cinema Media Bar */}
            <div className="flex items-center gap-4 md:gap-6 justify-center flex-1">
              {/* Jump -30s */}
              <button 
                onClick={() => seek(-30)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white transition-all backdrop-blur-md cursor-pointer"
                title="Jump back 30s"
              >
                <span className="text-xs font-semibold text-zinc-300">-30s</span>
              </button>

              {/* Rewind -10s */}
              <button 
                onClick={() => seek(-10)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/90 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer"
                title="Rewind 10s (←)"
              >
                <RotateCcw size={18} />
              </button>

              {/* Main Circular Play / Pause Button with Cyan Glow */}
              <button 
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.6)] border-2 border-cyan-300 transform hover:scale-105 active:scale-95 transition-all relative group cursor-pointer"
                title={isPlaying ? "Pause (Space / Enter)" : "Play (Space / Enter)"}
              >
                {isPlaying ? (
                  <Pause size={24} className="fill-white" />
                ) : (
                  <Play size={24} className="fill-white ml-1" />
                )}

                {/* Status Indicator */}
                <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-black/85 border border-cyan-400/50 text-[9px] font-bold text-cyan-300 uppercase tracking-wider shadow-md">
                  {isPlaying ? 'PAUSE' : 'PLAY'}
                </span>
              </button>

              {/* Fast-Forward +10s */}
              <button 
                onClick={() => seek(10)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/90 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer"
                title="Forward 10s (→)"
              >
                <RotateCw size={18} />
              </button>

              {/* Jump +30s */}
              <button 
                onClick={() => seek(30)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white transition-all backdrop-blur-md cursor-pointer"
                title="Jump forward 30s"
              >
                <span className="text-xs font-semibold text-zinc-300">+30s</span>
              </button>
            </div>

            {/* Right Controls: Subtitles, Audio Track & Fullscreen */}
            <div className="flex items-center justify-end gap-3 w-1/4 relative">
              {/* Audio Track Selector */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowAudioMenu(!showAudioMenu);
                    setShowSubMenu(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all backdrop-blur-md cursor-pointer ${
                    showAudioMenu 
                      ? 'bg-cyan-600 text-white border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]' 
                      : 'bg-white/10 hover:bg-white/20 text-white/80 border-white/15'
                  }`}
                  title="Audio stream options"
                >
                  <Music size={14} />
                  <span className="hidden sm:inline">Audio</span>
                </button>

                {/* Audio Tracks Dropdown */}
                {showAudioMenu && (
                  <div className="absolute right-0 bottom-full mb-3 w-56 rounded-2xl bg-zinc-900/95 border border-cyan-500/50 shadow-[0_10px_35px_rgba(0,0,0,0.9)] p-2 z-50 backdrop-blur-xl">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400 border-b border-zinc-800 mb-1 flex items-center justify-between">
                      <span>Audio Streams</span>
                      <span className="font-mono text-cyan-400/70 text-[9px]">JEmby</span>
                    </div>
                    <div className="space-y-0.5">
                      {audioTracks.map((track, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedAudio(i);
                            setShowAudioMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${
                            selectedAudio === i 
                              ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 font-bold' 
                              : 'text-zinc-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <div>
                            <div>{track.lang}</div>
                            <div className="text-[10px] text-zinc-400">{track.format}</div>
                          </div>
                          {selectedAudio === i && <Check size={14} className="text-cyan-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Subtitles Selector */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowSubMenu(!showSubMenu);
                    setShowAudioMenu(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all backdrop-blur-md cursor-pointer ${
                    showSubMenu || selectedSub !== null 
                      ? 'bg-cyan-600 text-white border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]' 
                      : 'bg-white/10 hover:bg-white/20 text-white/80 border-white/15'
                  }`}
                  title="Subtitles track options"
                >
                  <MessageSquare size={14} />
                  <span className="hidden sm:inline">Subtitles</span>
                </button>

                {/* Subtitles Dropdown */}
                {showSubMenu && (
                  <div className="absolute right-0 bottom-full mb-3 w-52 rounded-2xl bg-zinc-900/95 border border-cyan-500/50 shadow-[0_10px_35px_rgba(0,0,0,0.9)] p-2 z-50 backdrop-blur-xl">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400 border-b border-zinc-800 mb-1 flex items-center justify-between">
                      <span>Subtitles</span>
                      <span className="font-mono text-cyan-400/70 text-[9px]">JEmby</span>
                    </div>
                    <div className="space-y-0.5">
                      {subtitles.map((sub, i) => {
                        const isSubActive = i === 0 ? selectedSub === null : selectedSub === i;
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              setSelectedSub(i === 0 ? null : i);
                              setShowSubMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${
                              isSubActive 
                                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 font-bold' 
                                : 'text-zinc-300 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <span>{sub}</span>
                            {isSubActive && <Check size={14} className="text-cyan-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Fullscreen Button */}
              <button 
                onClick={toggleFullscreen}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white transition-all backdrop-blur-md cursor-pointer"
                title="Toggle Fullscreen (F)"
              >
                {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                <span className="text-xs font-medium hidden sm:inline">{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
              </button>
            </div>
          </div>

          {/* JEmby Navigation & Remote Legend Bar (Bottom Strip) */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-medium text-white/60 tracking-wider">
            <div className="flex items-center gap-5 flex-wrap">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-[10px]">
                  OK / Space
                </kbd>
                <span>Play / Pause</span>
              </span>

              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white/90 font-mono text-[10px]">
                  Esc / Back
                </kbd>
                <span>Return</span>
              </span>

              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white/90 font-mono text-[10px]">
                  ← / →
                </kbd>
                <span>Seek 10s</span>
              </span>

              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white/90 font-mono text-[10px]">
                  I
                </kbd>
                <span>Toggle HUD</span>
              </span>

              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white/90 font-mono text-[10px]">
                  F
                </kbd>
                <span>Fullscreen</span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-2 text-cyan-400 font-mono text-[10px]">
              <Sparkles size={12} className="text-cyan-400" />
              <span>JEmby Cinema Edition</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
