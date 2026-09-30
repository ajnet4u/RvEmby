import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import { Movie, SubtitleTrack, AudioTrackInfo, ServerSettings } from '../types';
import { 
  isAudioCodecSupported, 
  buildEmbyHlsStreamUrl, 
  buildEmbyStreamUrl,
  reportEmbyPlaybackStart, 
  reportEmbyPlaybackProgress, 
  reportEmbyPlaybackStopped 
} from '../api/emby';
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
  ArrowLeft,
  FastForward,
  Settings as SettingsIcon,
  Sun
} from 'lucide-react';

interface VideoPlayerProps {
  movie: Movie | null;
  nextMovie?: Movie | null;
  initialTime?: number;
  settings?: ServerSettings;
  onClose: () => void;
  onProgressUpdate?: (movieId: string, positionSeconds: number, durationSeconds: number) => void;
  onPlayNext?: (next: Movie) => void;
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

export function VideoPlayer({ 
  movie, 
  nextMovie, 
  initialTime, 
  settings, 
  onClose, 
  onProgressUpdate,
  onPlayNext 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playSessionId = useRef('jemby-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now()).current;

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

  // Up Next / Post-credits sequence state
  const [isCreditsSkipping, setIsCreditsSkipping] = useState(false);
  const [hasDismissedCredits, setHasDismissedCredits] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // Cinematic Ambient Glow (Ambilight) canvas and preferences
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
  const ambilightRafRef = useRef<number | null>(null);
  const [isAmbientGlowEnabled, setIsAmbientGlowEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('jemby_ambient_glow');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  // Settings menu state
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Subtitle & Audio tracks menu
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState(0);

  // Toggle ambient glow and save to localStorage
  const toggleAmbientGlow = useCallback(() => {
    setIsAmbientGlowEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('jemby_ambient_glow', String(next));
      } catch {}
      setToastMessage(next ? 'Ambient Glow: ON' : 'Ambient Glow: OFF');
      return next;
    });
  }, []);

  // Performance-optimized requestAnimationFrame rendering loop for Ambient Glow
  // Downscales frame to 64x36 pixels and stops immediately when paused to conserve CPU/GPU
  useEffect(() => {
    if (!isAmbientGlowEnabled || !isPlaying || isCreditsSkipping) {
      if (ambilightRafRef.current) {
        cancelAnimationFrame(ambilightRafRef.current);
        ambilightRafRef.current = null;
      }
      return;
    }

    const canvas = ambientCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let isSubscribed = true;

    const renderGlowFrame = () => {
      if (!isSubscribed) return;

      if (video.readyState >= 2 && !video.paused && !video.ended) {
        try {
          // Draw video frame downscaled to 64x36 for ultra-fast GPU processing
          ctx.drawImage(video, 0, 0, 64, 36);
        } catch {
          // Cross-origin canvas security exceptions are caught silently
        }
      }

      ambilightRafRef.current = requestAnimationFrame(renderGlowFrame);
    };

    ambilightRafRef.current = requestAnimationFrame(renderGlowFrame);

    return () => {
      isSubscribed = false;
      if (ambilightRafRef.current) {
        cancelAnimationFrame(ambilightRafRef.current);
        ambilightRafRef.current = null;
      }
    };
  }, [isAmbientGlowEnabled, isPlaying, isCreditsSkipping]);

  // Subtitle track list: strictly from Emby (NO dummy fallback)
  const subtitleTracks = useMemo<SubtitleTrack[]>(() => movie?.subtitleTracks || [], [movie?.subtitleTracks]);

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
        if (!showAudioMenu && !showSubMenu && !showSettingsMenu) {
          setShowControls(false);
        }
      }, 2500); // 2.5 seconds of mouse inactivity
    }
  }, [isPlaying, showAudioMenu, showSubMenu, showSettingsMenu]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isPlaying, resetControlsTimer]);

  // Lock body scroll while player is active (hide browser scrollbars)
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Audio track list
  const audioTracks = useMemo<AudioTrackInfo[]>(() => {
    return movie?.audioTracks && movie.audioTracks.length > 0 
      ? movie.audioTracks 
      : [
          { lang: 'English', format: 'Dolby Digital 5.1', codec: 'ac3' },
          { lang: 'French (VFF)', format: 'Dolby Atmos', codec: 'eac3' },
          { lang: 'English', format: 'Stereo AAC', codec: 'aac' }
        ];
  }, [movie?.audioTracks]);

  // Active stream URL and audio transcoding state
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>(movie?.videoUrl || '');
  const [isAudioTranscoding, setIsAudioTranscoding] = useState(() => {
    return (movie?.videoUrl || '').includes('AudioCodec=aac') || (movie?.videoUrl || '').includes('.m3u8');
  });

  useEffect(() => {
    if (movie?.videoUrl && movie.videoUrl !== activeVideoUrl) {
      setActiveVideoUrl(movie.videoUrl);
      setIsAudioTranscoding(movie.videoUrl.includes('AudioCodec=aac') || movie.videoUrl.includes('.m3u8'));
    }
  }, [movie?.videoUrl]);

  // Report playback start and stopped to Emby server for active dashboard display
  useEffect(() => {
    if (!settings?.apiKey || !movie?.id) return;
    const mediaSourceId = movie.mediaSourceId || movie.id;
    const primaryAudio = audioTracks[selectedAudio];
    const subTrack = selectedSub !== null ? subtitleTracks[selectedSub] : undefined;

    reportEmbyPlaybackStart(settings, movie.id, mediaSourceId, playSessionId, {
      audioStreamIndex: primaryAudio?.index,
      subtitleStreamIndex: subTrack?.index,
      isTranscoding: isAudioTranscoding
    });

    return () => {
      const cur = videoRef.current?.currentTime || 0;
      reportEmbyPlaybackStopped(settings, movie.id, mediaSourceId, playSessionId, cur);
    };
  }, [movie?.id, settings?.apiKey, settings?.url]);

  // Load stream via HLS.js if .m3u8, or native HTML5 video otherwise
  useEffect(() => {
    if (!videoRef.current || !activeVideoUrl) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (activeVideoUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        const startPos = initialTime ?? movie?.playbackPositionSeconds ?? 0;
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          startPosition: startPos > 0 ? startPos : -1
        });

        hls.loadSource(activeVideoUrl);
        hls.attachMedia(videoRef.current);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.warn('[HLS] Fatal error, attempting recovery:', data.type);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Native Apple Safari HLS
        videoRef.current.src = activeVideoUrl;
      }
    } else {
      videoRef.current.src = activeVideoUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeVideoUrl]);

  // Unified audio stream switcher with HLS seeking support & mediaSourceId
  const applyAudioSettings = (trackIndex: number, forceTranscode?: boolean) => {
    const track = audioTracks[trackIndex];
    if (!track || !movie || !videoRef.current) return;

    const currentPos = videoRef.current.currentTime;
    const shouldTranscode = forceTranscode !== undefined 
      ? forceTranscode 
      : (track.codec ? !isAudioCodecSupported(track.codec) : true);

    const mediaSourceId = movie.mediaSourceId || movie.id;

    if (shouldTranscode && settings?.url && settings?.apiKey) {
      // Use HLS for smooth seeking & audio transcode
      const hlsUrl = buildEmbyHlsStreamUrl(settings.url, movie.id, settings.apiKey, {
        mediaSourceId,
        audioStreamIndex: track.index,
        channels: 2,
        playSessionId
      });
      setActiveVideoUrl(hlsUrl);
      setIsAudioTranscoding(true);
      showToast(`Audio: ${track.lang} (${track.format}) • AAC Stereo (HLS)`);
    } else if (settings?.url && settings?.apiKey) {
      // Direct stream MP4
      const directUrl = buildEmbyStreamUrl(settings.url, movie.id, settings.apiKey, {
        mediaSourceId,
        audioStreamIndex: track.index,
        forceTranscodeAudio: false
      });
      setActiveVideoUrl(directUrl);
      setIsAudioTranscoding(false);
      showToast(`Audio: ${track.lang} (${track.format}) • Direct Stream`);
    }

    setTimeout(() => {
      if (videoRef.current && currentPos > 0) {
        try {
          videoRef.current.currentTime = currentPos;
          videoRef.current.play().catch(() => {});
        } catch (e) {}
      }
    }, 150);
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

  const activeSubTrack = selectedSub !== null && subtitleTracks[selectedSub] ? subtitleTracks[selectedSub] : null;
  const activeSubUrl = activeSubTrack?.url || null;

  // Load Subtitle Cues whenever selected subtitle changes
  useEffect(() => {
    if (selectedSub === null || !activeSubTrack || !activeSubUrl) {
      setSubCues(prev => (prev.length > 0 ? [] : prev));
      setActiveSubtitleText(prev => (prev !== '' ? '' : prev));
      return;
    }

    let isMounted = true;

    async function loadCues() {
      if (activeSubUrl) {
        // 1. Try our server proxy first to bypass any browser CORS restrictions
        const proxyUrl = `/api/subtitles?url=${encodeURIComponent(activeSubUrl)}`;
        try {
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const text = await res.text();
            if (isMounted) {
              const parsed = parseSubtitleText(text);
              if (parsed.length > 0) {
                setSubCues(parsed);
                showToast(`Subtitles: ${activeSubTrack.label} (${parsed.length} cues)`);
                return;
              }
            }
          }
        } catch (err) {
          console.warn("[Subtitles] Proxy fetch failed, attempting direct:", err);
        }

        // 2. Direct fetch fallback
        try {
          const res = await fetch(activeSubUrl, {
            headers: { 'Accept': 'text/vtt, text/plain, */*' }
          });
          if (res.ok) {
            const text = await res.text();
            if (isMounted) {
              const parsed = parseSubtitleText(text);
              if (parsed.length > 0) {
                setSubCues(parsed);
                showToast(`Subtitles: ${activeSubTrack.label} (${parsed.length} cues)`);
                return;
              }
            }
          }
        } catch (err) {
          console.warn("[Subtitles] Direct fetch failed:", err);
        }
      }

      if (isMounted) {
        setSubCues(prev => (prev.length > 0 ? [] : prev));
        setActiveSubtitleText(prev => (prev !== '' ? '' : prev));
        if (activeSubTrack.isText === false) {
          showToast(`Note: "${activeSubTrack.label}" is image-based (PGS/Bitmap). Text subtitles (SRT/ASS) are recommended.`);
        } else {
          showToast(`No text subtitle cues found for "${activeSubTrack.label}".`);
        }
      }
    }

    loadCues();

    return () => {
      isMounted = false;
    };
  }, [selectedSub, activeSubUrl]);

  // Save progress immediately on close, pause, or transition
  const reportCurrentProgress = useCallback(() => {
    if (movie?.id && videoRef.current && onProgressUpdate) {
      onProgressUpdate(movie.id, videoRef.current.currentTime, videoRef.current.duration || duration);
    }
  }, [movie, duration, onProgressUpdate]);

  const handleClosePlayer = useCallback(() => {
    reportCurrentProgress();
    onClose();
  }, [reportCurrentProgress, onClose]);

  // Action to play upcoming item (or close player if none)
  const handleTriggerPlayNext = useCallback(() => {
    reportCurrentProgress();
    setIsCreditsSkipping(false);
    setHasDismissedCredits(false);
    if (nextMovie && onPlayNext) {
      onPlayNext(nextMovie);
    } else {
      handleClosePlayer();
    }
  }, [nextMovie, onPlayNext, reportCurrentProgress, handleClosePlayer]);

  // Cancel Up Next countdown and watch credits full-screen
  const handleCancelCredits = useCallback(() => {
    setIsCreditsSkipping(false);
    setHasDismissedCredits(true);
  }, []);

  // Reset Up Next state when movie changes
  useEffect(() => {
    setIsCreditsSkipping(false);
    setHasDismissedCredits(false);
    setCountdown(10);
  }, [movie?.id]);

  // 10-second countdown ticker for Up Next sequence (only active when nextMovie exists)
  useEffect(() => {
    if (!isCreditsSkipping || !nextMovie) {
      setCountdown(10);
      return;
    }

    if (!isPlaying) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCreditsSkipping, nextMovie, isPlaying]);

  // When countdown hits 0 without interruption: trigger play next
  useEffect(() => {
    if (isCreditsSkipping && nextMovie && countdown === 0) {
      handleTriggerPlayNext();
    }
  }, [isCreditsSkipping, nextMovie, countdown, handleTriggerPlayNext]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const now = videoRef.current.currentTime;
    const dur = videoRef.current.duration || duration;
    setCurrentTime(now);

    // Synchronize active subtitle cue
    if (selectedSub !== null && subCues.length > 0) {
      const match = subCues.find(c => now >= c.start && now <= c.end);
      setActiveSubtitleText(match ? match.text : '');
    } else {
      setActiveSubtitleText('');
    }

    // Time Tracking Logic:
    // When the video reaches the last 5% of its duration (or a specific 'credits start' timestamp if available),
    // trigger an isCreditsSkipping state ONLY if nextMovie is available.
    // If nextMovie is null (meaning the user finished the series or standalone movie), quietly let video finish normally.
    if (dur > 5 && !hasDismissedCredits && nextMovie) {
      const creditsStartPoint = movie?.creditsStartTime && movie.creditsStartTime > 0 && movie.creditsStartTime < dur
        ? movie.creditsStartTime
        : dur * 0.95;

      if (now >= creditsStartPoint) {
        if (!isCreditsSkipping) {
          setIsCreditsSkipping(true);
        }
      } else if (isCreditsSkipping && now < creditsStartPoint - 2) {
        // If user scrubbed back before credits start, restore full screen
        setIsCreditsSkipping(false);
      }
    } else if (!nextMovie && isCreditsSkipping) {
      setIsCreditsSkipping(false);
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
    if (!movie?.id) return;

    progressReportTimer.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused && videoRef.current.currentTime > 2) {
        const curTime = videoRef.current.currentTime;
        const dur = videoRef.current.duration || duration;
        if (onProgressUpdate) {
          onProgressUpdate(movie.id, curTime, dur);
        }
        if (settings?.apiKey && movie) {
          const mediaSourceId = movie.mediaSourceId || movie.id;
          reportEmbyPlaybackProgress(settings, movie.id, mediaSourceId, playSessionId, curTime, false, {
            audioStreamIndex: audioTracks[selectedAudio]?.index,
            subtitleStreamIndex: selectedSub !== null ? subtitleTracks[selectedSub]?.index : undefined
          });
        }
      }
    }, 4000);

    return () => {
      if (progressReportTimer.current) clearInterval(progressReportTimer.current);
    };
  }, [movie?.id, duration, onProgressUpdate, settings?.apiKey, settings?.url, selectedAudio, selectedSub]);

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
          e.preventDefault();
          if (isCreditsSkipping) {
            handleCancelCredits();
          } else {
            handleClosePlayer();
          }
          break;
        case 'c':
        case 'C':
          if (isCreditsSkipping) {
            handleCancelCredits();
          }
          break;
        case 'g':
        case 'G':
          toggleAmbientGlow();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, isMuted, duration, isPlaying, isCreditsSkipping, toggleAmbientGlow, handleCancelCredits, handleClosePlayer, resetControlsTimer]);

  if (!movie || !movie.videoUrl) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const remainingTime = duration > 0 ? duration - currentTime : 0;

  return (
    <div 
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
      className={`fixed inset-0 w-screen h-screen m-0 p-0 z-50 bg-[#000000] flex items-center justify-center select-none overflow-hidden font-sans text-[#E0E0E0] ${
        !showControls && isPlaying ? 'cursor-none' : 'cursor-default'
      }`}
    >
      {/* Main Video Viewport Wrapper with Smooth Scale/Translate Transition to Top-Left Quadrant */}
      <div 
        onClick={isCreditsSkipping && nextMovie ? handleCancelCredits : undefined}
        className={`absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] origin-top-left flex items-center justify-center bg-black ${
          isCreditsSkipping && nextMovie
            ? 'scale-[0.32] sm:scale-[0.36] md:scale-[0.38] lg:scale-[0.40] translate-x-6 translate-y-6 sm:translate-x-10 sm:translate-y-10 md:translate-x-12 md:translate-y-12 rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] ring-1 ring-white/20 z-30 cursor-pointer group/minivid'
            : 'scale-100 translate-x-0 translate-y-0 z-10'
        }`}
        title={isCreditsSkipping && nextMovie ? "Click to watch full screen" : undefined}
      >
        {/* Cinematic Ambient Glow (Ambilight) Canvas */}
        {isAmbientGlowEnabled && (
          <canvas
            ref={ambientCanvasRef}
            width={64}
            height={36}
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-110 md:scale-[1.15] transition-opacity duration-500 ease-out z-0"
            style={{
              filter: 'blur(80px) brightness(0.8) opacity(0.7)',
              willChange: 'filter',
              opacity: isPlaying && (!isCreditsSkipping || !nextMovie) ? 0.7 : 0
            }}
          />
        )}

        <video 
          ref={videoRef}
          autoPlay 
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onError={handleVideoError}
          onPlay={() => {
            setIsPlaying(true);
            if (settings && movie && videoRef.current) {
              reportEmbyPlaybackProgress(settings, movie.id, movie.mediaSourceId || movie.id, playSessionId, videoRef.current.currentTime, false);
            }
          }}
          onPause={() => {
            setIsPlaying(false);
            reportCurrentProgress();
            if (settings && movie && videoRef.current) {
              reportEmbyPlaybackProgress(settings, movie.id, movie.mediaSourceId || movie.id, playSessionId, videoRef.current.currentTime, true);
            }
          }}
          className="relative z-10 w-full h-full object-contain pointer-events-auto"
          crossOrigin="anonymous"
        />

        {/* Shrunk Mini-Player Hover Hint to Watch Credits */}
        {isCreditsSkipping && nextMovie && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/minivid:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <div className="px-3.5 py-1.5 rounded-xl bg-black/85 backdrop-blur-md text-white text-xs font-medium flex items-center gap-2 border border-white/20 shadow-2xl">
              <Maximize size={14} />
              <span>Expand Credits</span>
            </div>
          </div>
        )}
      </div>

      {/* Up Next Post-Credits Showcase Container (in remaining screen space) */}
      <div 
        className={`absolute inset-0 z-20 flex flex-col justify-center items-end p-6 sm:p-10 md:p-12 lg:p-16 transition-opacity duration-700 ease-in-out ${
          isCreditsSkipping && nextMovie ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Right Pane Showcase (occupies ~55% width on desktop, clear of top-left quadrant) */}
        <div className="w-full md:w-[58%] lg:w-[54%] xl:w-[50%] flex flex-col gap-6 md:gap-7 bg-transparent text-[#E0E0E0]">
          
          {/* Header row: Circular Countdown + "UP NEXT" Tag */}
          <div className="flex items-center gap-4">
            {/* Circular Progress Ring with Countdown */}
            <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
              <svg className="w-14 h-14 -rotate-90 transform" viewBox="0 0 48 48">
                {/* Track */}
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="3.5"
                />
                {/* Animated progress ring */}
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="3.5"
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 * (1 - countdown / 10)}
                  strokeLinecap="round"
                  className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                />
              </svg>
              <span className="absolute font-mono font-bold text-sm text-[#FFFFFF] tabular-nums">
                {countdown}
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.12] border border-white/20 text-[#FFFFFF] text-[11px] font-bold tracking-widest uppercase">
                  <Sparkles size={11} className="text-white" />
                  Up Next
                </span>
                <span className="text-xs font-mono text-[#9E9E9E]">
                  Starting in {countdown}s
                </span>
              </div>
              <p className="text-xs text-[#9E9E9E]">
                Next title will begin automatically
              </p>
            </div>
          </div>

          {/* Upcoming Item Preview Card: Poster, Title, Episode Summary */}
          {nextMovie && (
            <div className="rounded-2xl bg-black/70 border border-white/[0.08] p-5 sm:p-6 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] flex flex-col sm:flex-row gap-5 items-start">
              {/* Poster / Thumbnail image */}
              <div className="relative w-28 sm:w-32 md:w-36 aspect-[2/3] shrink-0 rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-zinc-950">
                {nextMovie.poster || nextMovie.backdrop ? (
                  <img 
                    src={nextMovie.poster || nextMovie.backdrop || ''} 
                    alt={nextMovie.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900">
                    <Play size={24} />
                  </div>
                )}
                {nextMovie.resolutionBadge && (
                  <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[9px] font-mono text-white/90 border border-white/10">
                    {nextMovie.resolutionBadge}
                  </span>
                )}
              </div>

              {/* Title & Metadata & Episode Summary */}
              <div className="flex-1 min-w-0 space-y-2">
                {nextMovie.seriesName && (
                  <div className="text-xs font-semibold tracking-wider uppercase text-[#9E9E9E]">
                    {nextMovie.seriesName}
                    {nextMovie.seasonNumber !== undefined && nextMovie.episodeNumber !== undefined && (
                      <span className="text-white/60 ml-1.5">
                        · S{nextMovie.seasonNumber.toString().padStart(2, '0')}E{nextMovie.episodeNumber.toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                )}

                <h2 className="cinema-title text-xl sm:text-2xl font-bold text-[#FFFFFF] tracking-wide line-clamp-2">
                  {nextMovie.title}
                </h2>

                <div className="flex items-center gap-2.5 text-xs text-[#9E9E9E] font-medium">
                  {nextMovie.year && <span>{nextMovie.year}</span>}
                  {nextMovie.runtime && (
                    <>
                      <span className="opacity-40">·</span>
                      <span>{nextMovie.runtime}m</span>
                    </>
                  )}
                  {nextMovie.rating && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className="text-amber-300 font-medium">★ {nextMovie.rating}</span>
                    </>
                  )}
                  {nextMovie.hdrBadge && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className="text-white/70">{nextMovie.hdrBadge}</span>
                    </>
                  )}
                </div>

                {nextMovie.overview && (
                  <p className="text-xs sm:text-sm text-[#E0E0E0]/80 font-light leading-relaxed line-clamp-3 pt-1">
                    {nextMovie.overview}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons: "Play Now" and "Cancel / Watch Credits" */}
          <div className="flex items-center gap-3.5 pt-1">
            <button
              onClick={handleTriggerPlayNext}
              className="px-6 py-3 rounded-xl bg-[#FFFFFF] hover:bg-white/90 active:scale-[0.98] text-[#000000] font-semibold text-sm md:text-base flex items-center gap-2.5 transition-all shadow-[0_0_24px_rgba(255,255,255,0.25)] focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
            >
              <Play size={18} className="fill-black" />
              <span>Play Now</span>
            </button>

            <button
              onClick={handleCancelCredits}
              className="px-5 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] active:scale-[0.98] text-[#E0E0E0] hover:text-[#FFFFFF] font-medium text-sm md:text-base flex items-center gap-2 border border-white/[0.12] transition-all focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer backdrop-blur-md"
            >
              <span>Cancel / Watch Credits</span>
            </button>
          </div>

        </div>
      </div>

      {/* Subtle Black Gradient Overlay at the bottom (fading to transparent halfway up) */}
      <div 
        className={`pointer-events-none absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/90 via-black/35 to-transparent transition-opacity duration-[400ms] ease-in-out z-10 ${
          showControls && !isCreditsSkipping ? 'opacity-100' : 'opacity-0'
        }`} 
      />

      {/* Subtle Top Ambient Gradient */}
      <div 
        className={`pointer-events-none absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 via-black/25 to-transparent transition-opacity duration-[400ms] ease-in-out z-10 ${
          showControls && !isCreditsSkipping ? 'opacity-100' : 'opacity-0'
        }`} 
      />

      {/* High-Visibility Cinema Subtitles Overlay */}
      {activeSubtitleText && !isCreditsSkipping && (
        <div 
          className={`absolute left-0 right-0 flex justify-center pointer-events-none z-40 px-6 transition-all duration-300 ${
            showControls ? 'bottom-28 md:bottom-32' : 'bottom-10 md:bottom-14'
          }`}
        >
          <div className="max-w-4xl text-center">
            <span className="inline-block px-4 py-2 rounded-lg bg-black/85 backdrop-blur-md text-[#FFFFFF] text-lg sm:text-xl md:text-2xl font-semibold tracking-wide leading-relaxed shadow-[0_4px_24px_rgba(0,0,0,0.95)] border border-white/10 [text-shadow:_0_2px_4px_rgba(0,0,0,0.95)]">
              {activeSubtitleText}
            </span>
          </div>
        </div>
      )}

      {/* Quick Setting Toast Message */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/90 border border-white/15 text-[#E0E0E0] text-xs font-medium tracking-wider shadow-2xl backdrop-blur-md z-40 pointer-events-none">
          {toastMessage}
        </div>
      )}

      {/* Cinema HUD Overlay with Smooth 0.4s In-Out Transition */}
      <div className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-[400ms] ease-in-out pointer-events-none z-20 ${
        showControls && !isCreditsSkipping ? 'opacity-100' : 'opacity-0'
      }`}>
        
        {/* Top Header Bar */}
        <div className="w-full pt-6 pb-4 px-8 md:px-12 flex items-start justify-between pointer-events-auto">
          {/* Left Title & Metadata */}
          <div className="space-y-1">
            <h1 className="cinema-title text-xl sm:text-2xl md:text-3xl font-bold text-[#FFFFFF] tracking-wide drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
              {movie.title}
            </h1>

            <div className="flex items-center gap-2.5 text-xs text-[#9E9E9E] font-medium tracking-wider">
              {movie.year && <span>{movie.year}</span>}
              {movie.genres && movie.genres.length > 0 && (
                <>
                  <span className="opacity-40" aria-hidden="true">·</span>
                  <span>{movie.genres.slice(0, 2).join(' / ')}</span>
                </>
              )}
              {movie.resolutionBadge && (
                <>
                  <span className="opacity-40" aria-hidden="true">·</span>
                  <span className="text-[#E0E0E0]">{movie.resolutionBadge}</span>
                </>
              )}
              <span className="opacity-40" aria-hidden="true">·</span>
              <span className="font-mono text-[#E0E0E0]/80">
                {audioTracks[selectedAudio]?.format || 'Stereo'}
              </span>
              {isAudioTranscoding && (
                <>
                  <span className="opacity-40" aria-hidden="true">·</span>
                  <span className="text-zinc-400 font-mono text-[10px] uppercase">AAC Transcode</span>
                </>
              )}
            </div>
          </div>

          {/* Right Clock & Back Button */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[#9E9E9E] font-mono text-xs tracking-wider">
              <Clock size={14} className="text-[#E0E0E0]" />
              <span>{clockString}</span>
            </div>

            {/* Quick Skip to Credits button (only available when an Up Next title exists) */}
            {duration > 15 && nextMovie && (
              <button
                data-tv-focus="true"
                onClick={() => {
                  if (videoRef.current && duration > 0) {
                    const target = movie?.creditsStartTime && movie.creditsStartTime > 0
                      ? movie.creditsStartTime
                      : duration * 0.95;
                    videoRef.current.currentTime = target;
                    setCurrentTime(target);
                    setIsCreditsSkipping(true);
                  }
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-[#E0E0E0] hover:text-[#FFFFFF] text-xs font-medium transition-all backdrop-blur-md cursor-pointer border border-white/[0.08] cinema-focus"
                title="Jump to Credits / Up Next"
              >
                <FastForward size={13} />
                <span className="tracking-wide">Credits</span>
              </button>
            )}

            <button 
              data-tv-focus="true"
              onClick={handleClosePlayer}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-[#E0E0E0] hover:text-[#FFFFFF] text-xs font-medium transition-all backdrop-blur-md cursor-pointer border border-white/[0.08] cinema-focus"
              title="Close player (Esc / Back)"
            >
              <ArrowLeft size={14} />
              <span className="tracking-wider">Back</span>
              <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-[9px] font-mono text-[#9E9E9E]">ESC</kbd>
            </button>
          </div>
        </div>

        {/* Bottom Floating Control Bar with Subtle Glassmorphic Blur */}
        <div className="w-full pb-6 px-6 md:px-12 flex flex-col items-center pointer-events-auto">
          <div className="w-full max-w-5xl rounded-2xl bg-black/35 backdrop-blur-md border border-white/[0.06] p-4 md:px-6 md:py-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex flex-col gap-3">
            
            {/* Ultra-Minimalist Scrubber Timeline Bar */}
            <div className="flex items-center gap-3.5 text-xs font-mono font-medium text-[#9E9E9E]">
              {/* Current Time */}
              <span className="w-14 text-right tabular-nums text-[#FFFFFF] text-xs">
                {formatTime(currentTime)}
              </span>

              {/* Timeline Container (Expands slightly on hover) */}
              <div 
                ref={timelineRef}
                onClick={handleTimelineClick}
                onMouseEnter={() => setIsHoveringTimeline(true)}
                onMouseLeave={() => setIsHoveringTimeline(false)}
                onMouseMove={handleTimelineMouseMove}
                className="relative flex-1 h-5 flex items-center cursor-pointer group"
              >
                {/* Thin progress bar that slightly expands in height when hovered */}
                <div className="w-full h-[3px] group-hover:h-[6px] rounded-full bg-white/20 overflow-hidden transition-all duration-200 ease-out relative">
                  <div 
                    className="h-full bg-[#FFFFFF] shadow-[0_0_8px_rgba(255,255,255,0.7)] relative transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                  {/* Credits Start Point Marker */}
                  {duration > 15 && (
                    <div 
                      className="absolute top-0 bottom-0 w-[2px] bg-white/50 pointer-events-none"
                      style={{ 
                        left: `${movie?.creditsStartTime && movie.creditsStartTime > 0 ? (movie.creditsStartTime / duration) * 100 : 95}%` 
                      }}
                      title="Credits Start / Up Next"
                    />
                  )}
                </div>

                {/* Ultra-minimalist circular scrubber thumb */}
                <div 
                  className="absolute w-3.5 h-3.5 rounded-full bg-[#FFFFFF] shadow-[0_0_12px_rgba(255,255,255,0.9)] -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform duration-150 pointer-events-none"
                  style={{ left: `${progressPercent}%` }}
                />

                {/* Hover Tooltip Timestamp */}
                {isHoveringTimeline && hoverTime !== null && (
                  <div 
                    className="absolute bottom-6 -translate-x-1/2 px-2.5 py-1 rounded-md bg-black/90 border border-white/20 text-[11px] font-mono text-[#FFFFFF] shadow-xl pointer-events-none backdrop-blur-md"
                    style={{ left: `${hoverPosition}%` }}
                  >
                    {formatTime(hoverTime)}
                  </div>
                )}
              </div>

              {/* Remaining Time */}
              <span className="w-14 tabular-nums text-[#9E9E9E] text-xs">
                -{formatTime(remainingTime)}
              </span>
            </div>

            {/* Ultra-Minimalist Playback Control Center */}
            <div className="flex items-center justify-between pt-0.5">
              {/* Left Controls: Volume */}
              <div className="flex items-center gap-3 w-1/4">
                <button 
                  data-tv-focus="true"
                  onClick={toggleMute}
                  className="p-2 rounded-full text-[#E0E0E0] hover:text-[#FFFFFF] hover:bg-white/[0.08] transition-all cursor-pointer cinema-focus"
                  title={isMuted ? "Unmute (M)" : "Mute (M)"}
                >
                  {isMuted ? <VolumeX size={17} className="text-zinc-400" /> : <Volume2 size={17} />}
                </button>

                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 accent-white cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                  title="Volume"
                />
              </div>

              {/* Center Controls: Minimalist Media Buttons */}
              <div className="flex items-center gap-4 md:gap-5 justify-center flex-1">
                {/* Rewind -10s */}
                <button 
                  data-tv-focus="true"
                  onClick={() => seek(-10)}
                  className="p-2 rounded-full text-[#E0E0E0] hover:text-[#FFFFFF] hover:bg-white/[0.08] transition-all cursor-pointer cinema-focus active:scale-95"
                  title="Rewind 10s (←)"
                >
                  <RotateCcw size={18} />
                </button>

                {/* Main Circular Play / Pause Button */}
                <button 
                  data-tv-focus="true"
                  onClick={togglePlay}
                  className="w-11 h-11 rounded-full bg-white/[0.14] hover:bg-white/[0.25] text-[#FFFFFF] flex items-center justify-center transition-all backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.18)] active:scale-95 cinema-focus cursor-pointer border border-white/[0.1]"
                  title={isPlaying ? "Pause (Space / Enter)" : "Play (Space / Enter)"}
                >
                  {isPlaying ? (
                    <Pause size={20} className="fill-white" />
                  ) : (
                    <Play size={20} className="fill-white ml-0.5" />
                  )}
                </button>

                {/* Fast-Forward +10s */}
                <button 
                  data-tv-focus="true"
                  onClick={() => seek(10)}
                  className="p-2 rounded-full text-[#E0E0E0] hover:text-[#FFFFFF] hover:bg-white/[0.08] transition-all cursor-pointer cinema-focus active:scale-95"
                  title="Forward 10s (→)"
                >
                  <RotateCw size={18} />
                </button>
              </div>

              {/* Right Controls: Audio, Subtitles & Fullscreen */}
              <div className="flex items-center justify-end gap-2.5 w-1/4 relative">
                {/* Audio Track Selector */}
                <div className="relative">
                  <button 
                    data-tv-focus="true"
                    onClick={() => {
                      setShowAudioMenu(!showAudioMenu);
                      setShowSubMenu(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all backdrop-blur-md cursor-pointer border cinema-focus ${
                      showAudioMenu 
                        ? 'bg-white/[0.18] text-[#FFFFFF] border-white/30' 
                        : 'bg-white/[0.06] hover:bg-white/[0.12] text-[#E0E0E0] hover:text-[#FFFFFF] border-white/[0.06]'
                    }`}
                    title="Audio stream options"
                  >
                    <Music size={14} />
                    <span className="hidden sm:inline">Audio</span>
                  </button>

                  {/* Audio Tracks Dropdown */}
                  {showAudioMenu && (
                    <div className="absolute right-0 bottom-full mb-3 w-64 rounded-xl bg-black/90 border border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.9)] p-2 z-50 backdrop-blur-xl">
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#9E9E9E] border-b border-white/[0.08] mb-1 flex items-center justify-between">
                        <span>Audio Streams</span>
                        <span className="font-mono text-zinc-500 text-[9px]">Select</span>
                      </div>
                      <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                        {audioTracks.map((track, i) => {
                          const isDirectCompatible = track.codec ? isAudioCodecSupported(track.codec) : true;
                          return (
                            <button
                              key={i}
                              data-tv-focus="true"
                              onClick={() => switchAudioTrack(i)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-all cursor-pointer cinema-focus ${
                                selectedAudio === i 
                                  ? 'bg-white/[0.15] text-[#FFFFFF] font-semibold' 
                                  : 'text-[#E0E0E0] hover:text-[#FFFFFF] hover:bg-white/[0.08]'
                              }`}
                            >
                              <div className="pr-2">
                                <div>{track.lang}</div>
                                <div className="text-[10px] text-[#9E9E9E]">{track.format}</div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isDirectCompatible && !isAudioTranscoding ? (
                                  <span className="text-[9px] font-mono text-emerald-400/80">DIRECT</span>
                                ) : (
                                  <span className="text-[9px] font-mono text-zinc-400">AAC</span>
                                )}
                                {selectedAudio === i && <Check size={14} className="text-[#FFFFFF]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-2 pt-2 border-t border-white/[0.08]">
                        <button
                          data-tv-focus="true"
                          onClick={toggleAudioTranscode}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-[10px] text-[#9E9E9E] hover:text-[#FFFFFF] transition-all cursor-pointer cinema-focus"
                        >
                          <span>Force AAC Transcoding</span>
                          <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] ${
                            isAudioTranscoding ? 'bg-white text-black' : 'bg-white/10 text-white/60'
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
                    data-tv-focus="true"
                    onClick={() => {
                      setShowSubMenu(!showSubMenu);
                      setShowAudioMenu(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all backdrop-blur-md cursor-pointer border cinema-focus ${
                      showSubMenu || selectedSub !== null 
                        ? 'bg-white/[0.18] text-[#FFFFFF] border-white/30' 
                        : 'bg-white/[0.06] hover:bg-white/[0.12] text-[#E0E0E0] hover:text-[#FFFFFF] border-white/[0.06]'
                    }`}
                    title="Subtitles track options"
                  >
                    <MessageSquare size={14} />
                    <span className="hidden sm:inline">
                      {selectedSub !== null ? 'Subtitles' : 'Subs'}
                    </span>
                  </button>

                  {/* Subtitles Dropdown */}
                  {showSubMenu && (
                    <div className="absolute right-0 bottom-full mb-3 w-56 rounded-xl bg-black/90 border border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.9)] p-2 z-50 backdrop-blur-xl">
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#9E9E9E] border-b border-white/[0.08] mb-1 flex items-center justify-between">
                        <span>Subtitles</span>
                        <span className="font-mono text-zinc-500 text-[9px]">Select</span>
                      </div>
                      <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                        <button
                          data-tv-focus="true"
                          onClick={() => {
                            setSelectedSub(null);
                            setShowSubMenu(false);
                            showToast('Subtitles: Off');
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-all cursor-pointer cinema-focus ${
                            selectedSub === null 
                              ? 'bg-white/[0.15] text-[#FFFFFF] font-semibold' 
                              : 'text-[#E0E0E0] hover:text-[#FFFFFF] hover:bg-white/[0.08]'
                          }`}
                        >
                          <span>Off</span>
                          {selectedSub === null && <Check size={14} className="text-[#FFFFFF]" />}
                        </button>

                        {subtitleTracks.length === 0 ? (
                          <div className="px-3 py-2 text-[11px] text-zinc-500 italic">No subtitles available</div>
                        ) : (
                          subtitleTracks.map((track, i) => {
                            const isSubActive = selectedSub === i;
                            return (
                              <button
                                key={track.id || i}
                                data-tv-focus="true"
                                onClick={() => {
                                  setSelectedSub(i);
                                  setShowSubMenu(false);
                                  showToast(`Subtitles: ${track.label}`);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-all cursor-pointer cinema-focus ${
                                  isSubActive 
                                    ? 'bg-white/[0.15] text-[#FFFFFF] font-semibold' 
                                    : 'text-[#E0E0E0] hover:text-[#FFFFFF] hover:bg-white/[0.08]'
                                }`}
                              >
                                <span className="truncate pr-2">{track.label}</span>
                                {isSubActive && <Check size={14} className="text-[#FFFFFF] shrink-0" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Player Settings (Ambient Glow, Playback Options) */}
                <div className="relative">
                  <button 
                    data-tv-focus="true"
                    onClick={() => {
                      setShowSettingsMenu(!showSettingsMenu);
                      setShowAudioMenu(false);
                      setShowSubMenu(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all backdrop-blur-md cursor-pointer border cinema-focus ${
                      showSettingsMenu || isAmbientGlowEnabled
                        ? 'bg-white/[0.18] text-[#FFFFFF] border-white/30' 
                        : 'bg-white/[0.06] hover:bg-white/[0.12] text-[#E0E0E0] hover:text-[#FFFFFF] border-white/[0.06]'
                    }`}
                    title="Player settings (Ambient Glow, Transcoding)"
                  >
                    <SettingsIcon size={14} className={showSettingsMenu ? 'rotate-45 transition-transform duration-300' : 'transition-transform duration-300'} />
                    <span className="hidden sm:inline">Settings</span>
                  </button>

                  {/* Settings Dropdown Menu */}
                  {showSettingsMenu && (
                    <div className="absolute right-0 bottom-full mb-3 w-72 rounded-xl bg-black/95 border border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.95)] p-3 z-50 backdrop-blur-xl">
                      <div className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#9E9E9E] border-b border-white/[0.08] mb-2.5 flex items-center justify-between">
                        <span>Player Settings</span>
                        <kbd className="font-mono text-zinc-500 text-[9px]">G to toggle</kbd>
                      </div>

                      {/* Ambient Glow (Ambilight) Toggle Row */}
                      <div className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] transition-colors border border-white/[0.06] flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#FFFFFF]">
                            <Sun size={13} className={isAmbientGlowEnabled ? 'text-amber-300' : 'text-[#9E9E9E]'} />
                            <span>Ambient Glow</span>
                          </div>
                          <div className="text-[10px] text-[#9E9E9E] leading-tight">
                            Dynamic edge backlighting (Ambilight)
                          </div>
                        </div>

                        {/* Interactive Toggle Switch */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isAmbientGlowEnabled}
                          onClick={toggleAmbientGlow}
                          className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out cinema-focus ${
                            isAmbientGlowEnabled 
                              ? 'bg-[#FFFFFF] shadow-[0_0_12px_rgba(255,255,255,0.4)]' 
                              : 'bg-white/20'
                          }`}
                          title={isAmbientGlowEnabled ? "Turn off Ambient Glow" : "Turn on Ambient Glow"}
                        >
                          <div
                            className={`w-4 h-4 rounded-full transition-transform duration-200 ease-in-out shadow-sm ${
                              isAmbientGlowEnabled ? 'translate-x-5 bg-[#000000]' : 'translate-x-0 bg-white/70'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Audio Transcode Toggle */}
                      <div className="mt-2.5 pt-2 border-t border-white/[0.08]">
                        <button
                          data-tv-focus="true"
                          onClick={toggleAudioTranscode}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-[10px] text-[#9E9E9E] hover:text-[#FFFFFF] transition-all cursor-pointer cinema-focus"
                        >
                          <span>Force AAC Transcoding</span>
                          <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] ${
                            isAudioTranscoding ? 'bg-white text-black' : 'bg-white/10 text-white/60'
                          }`}>
                            {isAudioTranscoding ? 'ON' : 'OFF'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fullscreen Button */}
                <button 
                  data-tv-focus="true"
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl text-[#E0E0E0] hover:text-[#FFFFFF] hover:bg-white/[0.08] transition-all cursor-pointer cinema-focus border border-white/[0.06]"
                  title="Toggle Fullscreen (F)"
                >
                  {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
                </button>
              </div>
            </div>

            {/* Quiet Keyboard & TV Remote Navigation Legend */}
            <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-[#9E9E9E] font-medium tracking-wide">
              <div className="flex items-center gap-4 flex-wrap">
                <span><kbd className="text-[#FFFFFF] font-mono">Space</kbd> Play/Pause</span>
                <span><kbd className="text-[#FFFFFF] font-mono">← / →</kbd> Seek 10s</span>
                <span><kbd className="text-[#FFFFFF] font-mono">↑ / ↓</kbd> Volume</span>
                <span><kbd className="text-[#FFFFFF] font-mono">M</kbd> Mute</span>
                <span><kbd className="text-[#FFFFFF] font-mono">G</kbd> Glow</span>
                <span><kbd className="text-[#FFFFFF] font-mono">F</kbd> Fullscreen</span>
                <span><kbd className="text-[#FFFFFF] font-mono">Esc</kbd> Return</span>
              </div>
              <span className="hidden md:inline text-zinc-500 font-mono text-[9px]">Cinema Mode</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
