export interface CodecInfo {
  id: string;
  name: string;
  category: 'video' | 'audio' | 'container';
  mimeType: string;
  details: string;
  supported: boolean;
  smooth?: boolean;
  powerEfficient?: boolean; // Hardware decoded
  directPlayEmby: boolean;
  notes?: string;
}

export interface DeviceMediaProfile {
  browser: string;
  platform: string;
  userAgent: string;
  screenResolution: string;
  devicePixelRatio: number;
  colorDepth: number;
  isHdrSupported: boolean;
  isWideGamutSupported: boolean;
  audioChannelsMax: number;
  codecs: CodecInfo[];
  testedAt: number;
}

const VIDEO_CANDIDATES: { id: string; name: string; mimeType: string; details: string; width?: number; height?: number; bitrate?: number; framerate?: number }[] = [
  {
    id: 'h264-high-1080p',
    name: 'H.264 / AVC (High Profile 1080p)',
    mimeType: 'video/mp4; codecs="avc1.640028"',
    details: 'Standard Full HD AVC / x264 profile used across Web & Emby',
    width: 1920,
    height: 1080,
    bitrate: 10000000,
    framerate: 60
  },
  {
    id: 'h264-main',
    name: 'H.264 / AVC (Main Profile)',
    mimeType: 'video/mp4; codecs="avc1.4D401F"',
    details: 'Universal streaming baseline compatible with almost all hardware',
    width: 1920,
    height: 1080
  },
  {
    id: 'hevc-main-4k',
    name: 'H.265 / HEVC (Main Profile 4K)',
    mimeType: 'video/mp4; codecs="hev1.1.6.L93.B0"',
    details: 'Modern 4K Ultra HD codec with 50% better compression than H.264',
    width: 3840,
    height: 2160,
    bitrate: 25000000,
    framerate: 60
  },
  {
    id: 'hevc-main10-hdr',
    name: 'H.265 / HEVC Main 10 (10-bit HDR)',
    mimeType: 'video/mp4; codecs="hev1.2.4.L153.B0"',
    details: '10-bit color profile used for HDR10 and 4K Blu-ray remuxes',
    width: 3840,
    height: 2160,
    bitrate: 35000000,
    framerate: 60
  },
  {
    id: 'hevc-hvc1',
    name: 'H.265 / HEVC (Apple / Safari HVC1)',
    mimeType: 'video/mp4; codecs="hvc1.1.6.L93.B0"',
    details: 'Apple/Safari & specific hardware TV container variant',
    width: 3840,
    height: 2160
  },
  {
    id: 'vp9-p0',
    name: 'VP9 Profile 0 (8-bit SDR)',
    mimeType: 'video/webm; codecs="vp09.00.10.08"',
    details: 'Google open video codec used for YouTube and WebM media',
    width: 1920,
    height: 1080
  },
  {
    id: 'vp9-p2-hdr',
    name: 'VP9 Profile 2 (10-bit HDR)',
    mimeType: 'video/webm; codecs="vp09.02.10.10.01.09.16.09.01"',
    details: '10-bit HDR variant of VP9 for wide color range displays',
    width: 3840,
    height: 2160
  },
  {
    id: 'av1-main',
    name: 'AV1 (AOMedia Video 1)',
    mimeType: 'video/mp4; codecs="av01.0.05M.08"',
    details: 'Next-generation royalty-free codec supported on modern GPUs & TVs',
    width: 1920,
    height: 1080
  },
  {
    id: 'av1-10bit-4k',
    name: 'AV1 Main 10 (4K 10-bit)',
    mimeType: 'video/mp4; codecs="av01.0.08M.10"',
    details: 'Next-gen 4K 10-bit video with superior compression efficiency',
    width: 3840,
    height: 2160
  },
  {
    id: 'dolby-vision-p5',
    name: 'Dolby Vision (Profile 5)',
    mimeType: 'video/mp4; codecs="dvh1.05.06"',
    details: 'Dolby Vision single-layer proprietary HDR streaming profile',
    width: 3840,
    height: 2160
  },
  {
    id: 'dolby-vision-p8',
    name: 'Dolby Vision (Profile 8)',
    mimeType: 'video/mp4; codecs="dvh1.08.06"',
    details: 'Dolby Vision with HDR10 cross-compatibility layer',
    width: 3840,
    height: 2160
  },
  {
    id: 'mpeg4',
    name: 'MPEG-4 Part 2 / XviD',
    mimeType: 'video/mp4; codecs="mp4v.20.8"',
    details: 'Legacy media format for older rips and TV shows'
  },
  {
    id: 'vp8',
    name: 'VP8 (WebM)',
    mimeType: 'video/webm; codecs="vp8"',
    details: 'Open web video standard predecessor to VP9'
  }
];

const AUDIO_CANDIDATES: { id: string; name: string; mimeType: string; details: string; channels?: number }[] = [
  {
    id: 'aac-lc',
    name: 'AAC-LC (Stereo)',
    mimeType: 'audio/mp4; codecs="mp4a.40.2"',
    details: 'Default industry stereo audio format across all platforms',
    channels: 2
  },
  {
    id: 'aac-51',
    name: 'AAC Multi-Channel (5.1 Surround)',
    mimeType: 'audio/mp4; codecs="mp4a.40.2"',
    details: 'Surround sound audio track with 6 discrete channels',
    channels: 6
  },
  {
    id: 'ac3',
    name: 'Dolby Digital (AC-3 5.1)',
    mimeType: 'audio/mp4; codecs="ac-3"',
    details: 'Standard DVD/Broadcast 5.1 surround sound audio',
    channels: 6
  },
  {
    id: 'eac3',
    name: 'Dolby Digital Plus (E-AC-3 / Atmos)',
    mimeType: 'audio/mp4; codecs="ec-3"',
    details: 'High-bandwidth multi-channel audio used by Netflix & Disney+',
    channels: 8
  },
  {
    id: 'truehd',
    name: 'Dolby TrueHD (Lossless / Atmos)',
    mimeType: 'audio/mp4; codecs="mlpa"',
    details: 'Lossless Blu-ray master audio stream'
  },
  {
    id: 'dts',
    name: 'DTS Digital Surround',
    mimeType: 'audio/mp4; codecs="dts-"',
    details: 'Discrete multi-channel surround sound format'
  },
  {
    id: 'dts-hd',
    name: 'DTS-HD Master Audio / DTS:X',
    mimeType: 'audio/mp4; codecs="dtsh"',
    details: 'High-definition lossless audio format'
  },
  {
    id: 'opus',
    name: 'Opus Interactive Audio',
    mimeType: 'audio/webm; codecs="opus"',
    details: 'State of the art open audio codec for high fidelity at low bitrates',
    channels: 2
  },
  {
    id: 'flac',
    name: 'FLAC (Free Lossless Audio Codec)',
    mimeType: 'audio/flac',
    details: 'Lossless audio compression standard preserving bit-perfect master'
  },
  {
    id: 'mp3',
    name: 'MP3 (MPEG-1 Audio Layer III)',
    mimeType: 'audio/mpeg',
    details: 'Universal audio standard with 100% device compatibility'
  },
  {
    id: 'pcm',
    name: 'WAV / Linear PCM',
    mimeType: 'audio/wav',
    details: 'Uncompressed raw digital audio waveform'
  }
];

const CONTAINER_CANDIDATES: { id: string; name: string; mimeType: string; details: string }[] = [
  {
    id: 'mp4-container',
    name: 'MP4 Container (.mp4, .m4v)',
    mimeType: 'video/mp4',
    details: 'MPEG-4 standard file container for video and audio'
  },
  {
    id: 'mkv-container',
    name: 'Matroska Container (.mkv)',
    mimeType: 'video/x-matroska',
    details: 'Open flexible container capable of holding unlimited subtitle & audio tracks'
  },
  {
    id: 'webm-container',
    name: 'WebM Container (.webm)',
    mimeType: 'video/webm',
    details: 'Royalty-free HTML5 video container based on Matroska'
  },
  {
    id: 'hls-container',
    name: 'HLS Stream (.m3u8)',
    mimeType: 'application/x-mpegURL',
    details: 'HTTP Live Streaming protocol for adaptive bitrate delivery'
  }
];

/**
 * Checks a video or audio candidate using both MediaCapabilities and canPlayType fallback.
 */
async function testCodec(candidate: any, category: 'video' | 'audio' | 'container'): Promise<CodecInfo> {
  let supported = false;
  let smooth = false;
  let powerEfficient = false;

  // Method 1: HTML5 canPlayType
  if (category === 'video' || category === 'container') {
    const video = document.createElement('video');
    const canPlay = video.canPlayType(candidate.mimeType);
    if (canPlay === 'probably' || canPlay === 'maybe') {
      supported = true;
    }
  } else if (category === 'audio') {
    const audio = document.createElement('audio');
    const canPlay = audio.canPlayType(candidate.mimeType);
    if (canPlay === 'probably' || canPlay === 'maybe') {
      supported = true;
    }
  }

  // Method 2: MediaCapabilities API (W3C standard)
  if (typeof navigator !== 'undefined' && (navigator as any).mediaCapabilities?.decodingInfo) {
    try {
      if (category === 'video') {
        const config: any = {
          type: 'file',
          video: {
            contentType: candidate.mimeType,
            width: candidate.width || 1920,
            height: candidate.height || 1080,
            bitrate: candidate.bitrate || 10000000,
            framerate: candidate.framerate || 30
          }
        };
        const info = await (navigator as any).mediaCapabilities.decodingInfo(config);
        if (info.supported) {
          supported = true;
          smooth = !!info.smooth;
          powerEfficient = !!info.powerEfficient;
        }
      } else if (category === 'audio') {
        const config: any = {
          type: 'file',
          audio: {
            contentType: candidate.mimeType,
            channels: candidate.channels || 2,
            bitrate: 320000,
            samplerate: 48000
          }
        };
        const info = await (navigator as any).mediaCapabilities.decodingInfo(config);
        if (info.supported) {
          supported = true;
          smooth = !!info.smooth;
          powerEfficient = !!info.powerEfficient;
        }
      }
    } catch (e) {
      // Ignore mediaCapabilities failure and rely on canPlayType
    }
  }

  return {
    id: candidate.id,
    name: candidate.name,
    category,
    mimeType: candidate.mimeType,
    details: candidate.details,
    supported,
    smooth: supported ? smooth : false,
    powerEfficient: supported ? powerEfficient : false,
    directPlayEmby: supported
  };
}

/**
 * Runs a comprehensive device hardware capability and codec diagnostic scan.
 */
export async function detectDeviceCapabilities(): Promise<DeviceMediaProfile> {
  const ua = navigator.userAgent;
  let browser = 'Modern Web Browser';
  if (ua.includes('TV Bro')) browser = 'TV Bro Browser (Android TV)';
  else if (ua.includes('JioPages')) browser = 'JioPages TV Browser';
  else if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/')) browser = 'Google Chrome / Chromium';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Apple Safari';

  let platform = navigator.platform || 'Unknown OS';
  if (ua.includes('Android')) platform = ua.includes('TV') ? 'Android TV' : 'Android';
  else if (ua.includes('Linux')) platform = 'Linux (e.g. Raspberry Pi / CasaOS)';
  else if (ua.includes('Windows')) platform = 'Windows PC';
  else if (ua.includes('Macintosh')) platform = 'macOS';

  const screenRes = typeof window !== 'undefined' 
    ? `${window.screen.width} × ${window.screen.height} (${window.innerWidth} × ${window.innerHeight} viewport)`
    : 'Unknown';

  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const colorDepth = typeof window !== 'undefined' ? (window.screen.colorDepth || 24) : 24;

  const isHdrSupported = typeof window !== 'undefined' && window.matchMedia 
    ? window.matchMedia('(dynamic-range: high)').matches 
    : false;

  const isWideGamutSupported = typeof window !== 'undefined' && window.matchMedia 
    ? window.matchMedia('(color-gamut: p3)').matches 
    : false;

  // Test all candidates in parallel
  const videoPromises = VIDEO_CANDIDATES.map(c => testCodec(c, 'video'));
  const audioPromises = AUDIO_CANDIDATES.map(c => testCodec(c, 'audio'));
  const containerPromises = CONTAINER_CANDIDATES.map(c => testCodec(c, 'container'));

  const [videoCodecs, audioCodecs, containerCodecs] = await Promise.all([
    Promise.all(videoPromises),
    Promise.all(audioPromises),
    Promise.all(containerPromises)
  ]);

  return {
    browser,
    platform,
    userAgent: ua,
    screenResolution: screenRes,
    devicePixelRatio: dpr,
    colorDepth,
    isHdrSupported,
    isWideGamutSupported,
    audioChannelsMax: 6,
    codecs: [...videoCodecs, ...audioCodecs, ...containerCodecs],
    testedAt: Date.now()
  };
}
