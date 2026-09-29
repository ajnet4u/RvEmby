import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Movie, SubtitleTrack, AudioTrackInfo } from '../types';
import { isAudioCodecSupported } from '../api/emby';
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
  initialTime?: number;
  onClose: () => void;
  onProgressUpdate?: (movieId: string, positionSeconds: number, durationSeconds: number) => void;
}

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

/**
 * Robust WebVTT and SubRip (SRT) subtitle text parser.
 */
function parseSubtitleText(raw: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const timeRegex = /(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})/;

  let currentStart = 0;
  let currentEnd = 0;
  let currentText: string[] = [];
  let inCue = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(timeRegex);

    if (match) {
      if (inCue && currentText.length > 0) {
        cues.push({ start: currentStart, end: currentEnd, text: currentText.join('\n') });
        currentText = [];
      }
      inCue = true;
      const sH = parseInt(match[1] || '0', 10);
      const sM = parseInt(match[2], 10);
      const sS = parseInt(match[3], 10);
      const sMs = parseInt(match[4], 10);
      currentStart = sH * 3600 + sM * 60 + sS + sMs / 1000;

      const eH = parseInt(match[5] || '0', 10);
      const eM = parseInt(match[6], 10);
      const eS = parseInt(match[7], 10);
      const eMs = parseInt(match[8], 10);
      currentEnd = eH * 3600 + eM * 60 + eS + eMs / 1000;
    } else if (inCue) {
      if (line === '') {
        if (currentText.length > 0) {
          cues.push({ start: currentStart, end: currentEnd, text: currentText.join('\n') });
          currentText = [];
        }
        inCue = false;
      } else if (!/^\d+$/.test(line) && !line.startsWith('NOTE') && !line.startsWith('WEBVTT')) {
        const clean = line.replace(/<[^>]*>/g, '');
        if (clean) currentText.push(clean);
      }
    }
  }

  if (inCue && currentText.length > 0) {
    cues.push({ start: currentStart, end: currentEnd, text: currentText.join('\n') });
  }

  return cues;
}

export function VideoPlayer({ movie, initialTime, onClose, onProgressUpdate }: VideoPlayerProps) {
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

  // Subtitle track list: strictly from Emby (NO dummy fallback)
  const subtitleTracks: SubtitleTrack[] = movie?.subtitleTracks || [];

  // Active Subtitle State (null = Off; number >= 0 = subtitle index)
  // Subtitles default to OFF unless a real subtitle track has isDefault: true
  const [selectedSub, setSelectedSub] = useState<number | null>(() => {
    if (movie?.subtitleTracks && movie.subtitleTracks.length > 0) {
      const defIdx = movie.subtitleTracks.findIndex(t => t.isDefault);
      return defIdx !== -1 ? defIdx : null;
    }
    return null;
  });
  const [subCues, setSubCues] = useState<SubtitleCue[]>([]);
  const [activeSubtitleText, setActiveSubtitleText] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // System clock
  const [clockString, setClockString] = useState('');
  const hasSeekedInitial = useRef(false);
  const progressReportTimer = useRef<NodeJS.Timeout | null>(null);

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

  // Audio track list
  const audioTracks: AudioTrackInfo[] = movie?.audioTracks && movie.audioTracks.length > 0 
    ? movie.audioTracks 
    : [
        { lang: 'English', format: 'Dolby Digital 5.1', codec: 'ac3' },
        { lang: 'French (VFF)', format: 'Dolby Atmos', codec: 'eac3' },
        { lang: 'English', format: 'Stereo AAC', codec: 'aac' }
      ];

  // Active stream URL and audio transcoding state
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>(movie?.videoUrl || '');
  const [isAudioTranscoding, setIsAudioTranscoding] = useState(() => {
    return (movie?.videoUrl || '').includes('AudioCodec=aac');
  });

  useEffect(() => {
    if (movie?.videoUrl) {
      setActiveVideoUrl(movie.videoUrl);
      setIsAudioTranscoding(movie.videoUrl.includes('AudioCodec=aac'));
    }
  }, [movie?.videoUrl]);

  // Unified audio stream switcher with stereo downmixing & mediaSourceId
  const applyAudioSettings = (trackIndex: number, forceTranscode?: boolean) => {
    const track = audioTracks[trackIndex];
    if (!track || !movie?.videoUrl || !videoRef.current) return;

    const currentPos = videoRef.current.currentTime;
    const shouldTranscode = forceTranscode !== undefined 
      ? forceTranscode 
      : (track.codec ? !isAudioCodecSupported(track.codec) : true);

    try {
      const url = new URL(movie.videoUrl, window.location.href);
      const mediaSourceId = movie.mediaSourceId || movie.id;

      url.searchParams.set('MediaSourceId', mediaSourceId);
      url.searchParams.set('DeviceId', 'jemby-web-player');

      if (shouldTranscode) {
        url.searchParams.set('VideoCodec', 'copy');
        url.searchParams.set('AudioCodec', 'aac');
        url.searchParams.set('AudioBitRate', '384000');
        url.searchParams.set('TranscodingMaxAudioChannels', '2'); // Stereo downmix guarantees clear dialogue on all speakers!
        url.searchParams.set('EnableAudioVbrEncoding', 'false');
        url.searchParams.delete('Static');
        setIsAudioTranscoding(true);
      } else {
        url.searchParams.set('Static', 'true');
        url.searchParams.delete('VideoCodec');
        url.searchParams.delete('AudioCodec');
        url.searchParams.delete('AudioBitRate');
        url.searchParams.delete('TranscodingMaxAudioChannels');
        url.searchParams.delete('EnableAudioVbrEncoding');
        setIsAudioTranscoding(false);
      }

      if (track.index !== undefined) {
        url.searchParams.set('AudioStreamIndex', track.index.toString());
      }

      const newUrl = url.toString();
      setActiveVideoUrl(newUrl);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = currentPos;
          videoRef.current.play().catch(() => {});
        }
      }, 50);

      showToast(`Audio: ${track.lang} (${track.format}) ${shouldTranscode ? '• AAC Stereo' : '• Direct'}`);
    } catch (e) {}
  };

  const switchAudioTrack = (index: number) => {
    setSelectedAudio(index);
    setShowAudioMenu(false);
    applyAudioSettings(index);
  };

  // Toggle Force Audio Transcoding (useful if browser plays video but has no sound)
  const toggleAudioTranscode = () => {
    const newTranscodeState = !isAudioTranscoding;
    applyAudioSettings(selectedAudio, newTranscodeState);
    showToast(newTranscodeState ? 'Forced AAC Audio Transcode ON' : 'Direct Play Audio Restored');
  };

  // Reactive fallback on video decode error
  const handleVideoError = () => {
    if (!isAudioTranscoding && movie?.videoUrl && videoRef.current) {
      console.warn('[JEmby Player] Media decode error encountered. Activating audio transcoding fallback...');
      applyAudioSettings(selectedAudio, true);
      showToast('Incompatible audio track. Switched to AAC transcoding.');
    }
  };

  // Load Subtitle Cues whenever selected subtitle changes
  useEffect(() => {
    if (selectedSub === null) {
      setSubCues([]);
      setActiveSubtitleText('');
      return;
    }

    const track = subtitleTracks[selectedSub];
    if (!track) {
      setSubCues([]);
      setActiveSubtitleText('');
      return;
    }

    let isMounted = true;

    async function loadCues() {
      // If track has an Emby server WebVTT stream URL, fetch it
      if (track.url) {
        try {
          const res = await fetch(track.url, {
            headers: { 'Accept': 'text/vtt, text/plain, */*' }
          });
          if (res.ok) {
            const text = await res.text();
            if (isMounted) {
              const parsed = parseSubtitleText(text);
              setSubCues(parsed);
              return;
            }
          }
        } catch (err) {
          console.warn("Could not fetch remote VTT track:", err);
        }
      }

      if (isMounted) {
        setSubCues([]);
        setActiveSubtitleText('');
      }
    }

    loadCues();

    return () => {
      isMounted = false;
    };
  }, [selectedSub, subtitleTracks]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const now = videoRef.current.currentTime;
    setCurrentTime(now);

    // Synchronize active subtitle cue
    if (selectedSub !== null && subCues.length > 0) {
      const match = subCues.find(c => now >= c.start && now <= c.end);
      setActiveSubtitleText(match ? match.text : '');
    } else {
      setActiveSubtitleText('');
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);

      // Seek to resume position if provided
      const targetTime = initialTime ?? movie?.playbackPositionSeconds ?? 0;
      if (!hasSeekedInitial.current && targetTime > 0 && targetTime < dur - 15) {
        videoRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
        hasSeekedInitial.current = true;
      }
    }
  };

  // Periodic progress saving & Emby server progress update
  useEffect(() => {
    if (!movie?.id || !onProgressUpdate) return;

    progressReportTimer.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused && videoRef.current.currentTime > 5) {
        onProgressUpdate(movie.id, videoRef.current.currentTime, videoRef.current.duration || duration);
      }
    }, 4000);

    return () => {
      if (progressReportTimer.current) clearInterval(progressReportTimer.current);
    };
  }, [movie, duration, onProgressUpdate]);

  // Save progress immediately on close or pause
  const reportCurrentProgress = useCallback(() => {
    if (movie?.id && videoRef.current && onProgressUpdate) {
      onProgressUpdate(movie.id, videoRef.current.currentTime, videoRef.current.duration || duration);
    }
  }, [movie, duration, onProgressUpdate]);

  const handleClosePlayer = () => {
    reportCurrentProgress();
    onClose();
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
      reportCurrentProgress();
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

  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    setVolume(newVol);
    videoRef.current.volume = newVol;
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Keyboard and TV remote controls
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
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'i':
        case 'I':
          setShowControls(prev => !prev);
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
          handleClosePlayer();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, isMuted, duration, isPlaying, handleClosePlayer, resetControlsTimer]);

  if (!movie || !movie.videoUrl) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const remainingTime = duration > 0 ? duration - currentTime : 0;

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
        src={activeVideoUrl} 
        autoPlay 
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleVideoError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          reportCurrentProgress();
        }}
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
      />

      {/* High-Visibility Cinema Subtitles Overlay */}
      {activeSubtitleText && (
        <div 
          className={`absolute left-0 right-0 flex justify-center pointer-events-none z-40 px-6 transition-all duration-200 ${
            showControls ? 'bottom-28 md:bottom-32' : 'bottom-10 md:bottom-14'
          }`}
        >
          <div className="max-w-4xl text-center">
            <span className="inline-block px-4 py-2 rounded-lg bg-black/85 backdrop-blur-md text-white text-lg sm:text-xl md:text-2xl font-semibold tracking-wide leading-relaxed shadow-[0_4px_24px_rgba(0,0,0,0.95)] border border-white/10 [text-shadow:_0_2px_4px_rgba(0,0,0,0.95)]">
              {activeSubtitleText}
            </span>
          </div>
        </div>
      )}

      {/* Quick Setting Toast Message */}
      {toastMessage && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-zinc-900/90 border border-cyan-400/50 text-cyan-300 text-xs font-semibold tracking-wider uppercase shadow-2xl backdrop-blur-md z-40 pointer-events-none">
          {toastMessage}
        </div>
      )}

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
              <span className="text-cyan-300 font-mono font-semibold flex items-center gap-2">
                <span>{audioTracks[selectedAudio]?.format || 'Dolby Audio 5.1'}</span>
                {isAudioTranscoding && (
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/50 text-[9px] font-bold text-cyan-300 uppercase tracking-widest font-mono">
                    AAC Transcode
                  </span>
                )}
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
              onClick={handleClosePlayer}
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
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white transition-all backdrop-blur-md cursor-pointer"
                title={isMuted ? "Unmute (M)" : "Mute (M)"}
              >
                {isMuted ? <VolumeX size={18} className="text-rose-400" /> : <Volume2 size={18} />}
              </button>

              <input 
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-24 accent-cyan-400 cursor-pointer"
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
                  <div className="absolute right-0 bottom-full mb-3 w-64 rounded-2xl bg-zinc-900/95 border border-cyan-500/50 shadow-[0_10px_35px_rgba(0,0,0,0.9)] p-2 z-50 backdrop-blur-xl">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400 border-b border-zinc-800 mb-1 flex items-center justify-between">
                      <span>Audio Streams</span>
                      <span className="font-mono text-cyan-400/70 text-[9px]">JEmby Cinema</span>
                    </div>
                    <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
                      {audioTracks.map((track, i) => {
                        const isDirectCompatible = track.codec ? isAudioCodecSupported(track.codec) : true;
                        return (
                          <button
                            key={i}
                            onClick={() => switchAudioTrack(i)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${
                              selectedAudio === i 
                                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 font-bold' 
                                : 'text-zinc-300 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <div className="pr-2">
                              <div className="font-semibold">{track.lang}</div>
                              <div className="text-[10px] text-zinc-400">{track.format}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isDirectCompatible && !isAudioTranscoding ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/30 text-[8px] font-mono text-emerald-400 uppercase">
                                  DIRECT
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-[8px] font-mono text-cyan-300 uppercase">
                                  AAC
                                </span>
                              )}
                              {selectedAudio === i && <Check size={14} className="text-cyan-400" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick Transcode Toggle: For troubleshooting audio silence */}
                    <div className="mt-2 pt-2 border-t border-zinc-800">
                      <button
                        onClick={toggleAudioTranscode}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 text-[10px] text-zinc-300 hover:text-white transition-all cursor-pointer"
                        title="If you experience silent audio, toggle forced AAC transcoding"
                      >
                        <span className="flex items-center gap-1.5 font-medium">
                          <Sparkles size={11} className={isAudioTranscoding ? "text-cyan-400" : "text-zinc-500"} />
                          <span>Force AAC Transcoding</span>
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] ${
                          isAudioTranscoding ? 'bg-cyan-500 text-black' : 'bg-zinc-700 text-zinc-400'
                        }`}>
                          {isAudioTranscoding ? 'ON' : 'OFF'}
                        </span>
                      </button>
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
                  <span className="hidden sm:inline">
                    {selectedSub !== null ? 'Subtitles On' : 'Subtitles'}
                  </span>
                </button>

                {/* Subtitles Dropdown */}
                {showSubMenu && (
                  <div className="absolute right-0 bottom-full mb-3 w-56 rounded-2xl bg-zinc-900/95 border border-cyan-500/50 shadow-[0_10px_35px_rgba(0,0,0,0.9)] p-2 z-50 backdrop-blur-xl">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400 border-b border-zinc-800 mb-1 flex items-center justify-between">
                      <span>Subtitles</span>
                      <span className="font-mono text-cyan-400/70 text-[9px]">JEmby</span>
                    </div>
                    <div className="space-y-0.5">
                      {/* Off Option */}
                      <button
                        onClick={() => {
                          setSelectedSub(null);
                          setShowSubMenu(false);
                          showToast('Subtitles: Off');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${
                          selectedSub === null 
                            ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 font-bold' 
                            : 'text-zinc-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <span>Off</span>
                        {selectedSub === null && <Check size={14} className="text-cyan-400" />}
                      </button>

                      {/* Available Subtitle Tracks */}
                      {subtitleTracks.length === 0 ? (
                        <div className="px-3 py-2 text-[11px] text-zinc-500 italic">No subtitles available</div>
                      ) : (
                        subtitleTracks.map((track, i) => {
                          const isSubActive = selectedSub === i;
                          return (
                            <button
                              key={track.id || i}
                              onClick={() => {
                                setSelectedSub(i);
                                setShowSubMenu(false);
                                showToast(`Subtitles: ${track.label}`);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${
                                isSubActive 
                                  ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 font-bold' 
                                  : 'text-zinc-300 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <span className="truncate pr-2">{track.label}</span>
                              {isSubActive && <Check size={14} className="text-cyan-400 shrink-0" />}
                            </button>
                          );
                        })
                      )}
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
