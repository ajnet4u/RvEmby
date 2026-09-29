import { Movie, TvShow, Season, Episode, ServerSettings, SubtitleTrack, AudioTrackInfo } from '../types';

/**
 * Detects if an audio codec can be decoded directly in a standard web browser.
 * Web browsers natively decode ONLY: AAC, MP3, Opus, Vorbis, FLAC.
 * AC3 (Dolby Digital), EAC3 (Dolby Digital Plus), TrueHD, and all DTS variants (DTS, DTS-HD MA)
 * CANNOT be decoded natively by browsers and will play in complete silence unless transcoded to AAC!
 */
export function isAudioCodecSupported(codec?: string): boolean {
  if (!codec) return false;
  const c = codec.toLowerCase().trim();

  // ONLY these codecs are universally decoded across browsers without proprietary decoders:
  if (c === 'aac' || c === 'mp3' || c === 'opus' || c === 'vorbis' || c === 'flac' || c === 'wav' || c === 'm4a') {
    return true;
  }

  // AC3, EAC3, DTS, DCA, TRUEHD, MLP, WMA all require AAC audio transcoding for web playback
  return false;
}

/**
 * Builds an optimal Emby / Jellyfin video stream URL.
 * Automatically transcodes unsupported audio codecs (AC3, EAC3, DTS, TrueHD) to AAC,
 * while using VideoCodec=copy (Direct Stream Video - original 4K/1080p quality at 0% video CPU load).
 */
export function buildEmbyStreamUrl(
  baseUrl: string,
  itemId: string,
  apiKey: string,
  options?: {
    mediaSourceId?: string;
    audioStreamIndex?: number;
    forceTranscodeAudio?: boolean;
    audioCodec?: string;
    channels?: number;
  }
): string {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const mediaSourceId = options?.mediaSourceId || itemId;

  // Determine if audio transcoding to AAC is required
  const needsAudioTranscode = options?.forceTranscodeAudio !== undefined
    ? options.forceTranscodeAudio
    : (options?.audioCodec ? !isAudioCodecSupported(options.audioCodec) : true);

  if (needsAudioTranscode) {
    const params = new URLSearchParams({
      MediaSourceId: mediaSourceId,
      VideoCodec: 'copy', // Direct stream video copy - 100% picture quality & 0% video transcoding CPU
      AudioCodec: 'aac',
      AudioBitRate: '384000',
      TranscodingMaxAudioChannels: (options?.channels || 2).toString(), // 2 channels stereo downmix guarantees dialogue in all browsers!
      EnableAudioVbrEncoding: 'false',
      DeviceId: 'jemby-web-player',
      api_key: apiKey
    });
    if (options?.audioStreamIndex !== undefined) {
      params.append('AudioStreamIndex', options.audioStreamIndex.toString());
    }
    return `${cleanBase}/Videos/${itemId}/stream.mp4?${params.toString()}`;
  }

  // Direct play (ONLY for native AAC/MP3 files)
  const params = new URLSearchParams({
    Static: 'true',
    MediaSourceId: mediaSourceId,
    api_key: apiKey
  });
  if (options?.audioStreamIndex !== undefined) {
    params.append('AudioStreamIndex', options.audioStreamIndex.toString());
  }
  return `${cleanBase}/Videos/${itemId}/stream.mp4?${params.toString()}`;
}

/**
 * Builds an Emby HLS Stream URL (master.m3u8).
 * HLS segmenting allows instant forward/backward seeking and scrubbing during transcoding,
 * without restarting from 0:00!
 */
export function buildEmbyHlsStreamUrl(
  baseUrl: string,
  itemId: string,
  apiKey: string,
  options?: {
    mediaSourceId?: string;
    audioStreamIndex?: number;
    subtitleStreamIndex?: number;
    forceTranscodeAudio?: boolean;
    audioCodec?: string;
    channels?: number;
    playSessionId?: string;
  }
): string {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const mediaSourceId = options?.mediaSourceId || itemId;

  const params = new URLSearchParams({
    MediaSourceId: mediaSourceId,
    VideoCodec: 'copy', // Stream copy video (0% CPU, 100% picture quality)
    AudioCodec: 'aac',
    AudioBitRate: '384000',
    TranscodingMaxAudioChannels: (options?.channels || 2).toString(),
    EnableAudioVbrEncoding: 'false',
    DeviceId: 'jemby-web-player',
    api_key: apiKey
  });

  if (options?.audioStreamIndex !== undefined) {
    params.append('AudioStreamIndex', options.audioStreamIndex.toString());
  }
  if (options?.subtitleStreamIndex !== undefined && options.subtitleStreamIndex >= 0) {
    params.append('SubtitleStreamIndex', options.subtitleStreamIndex.toString());
  }
  if (options?.playSessionId) {
    params.append('PlaySessionId', options.playSessionId);
  }

  return `${cleanBase}/Videos/${itemId}/master.m3u8?${params.toString()}`;
}

/**
 * Reports playback start to Emby server.
 * This makes the active stream appear immediately in the Emby Server Dashboard!
 */
export async function reportEmbyPlaybackStart(
  settings: ServerSettings,
  itemId: string,
  mediaSourceId: string,
  playSessionId: string,
  options?: {
    audioStreamIndex?: number;
    subtitleStreamIndex?: number;
    isTranscoding?: boolean;
  }
): Promise<void> {
  if (!settings.apiKey) return;
  const baseUrl = settings.url.replace(/\/$/, '');
  const url = `${baseUrl}/Sessions/Playing?api_key=${encodeURIComponent(settings.apiKey)}`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Token': settings.apiKey,
        'X-Emby-Device-Name': 'JEmby Cinema Player',
        'X-Emby-Device-Id': 'jemby-web-player'
      },
      body: JSON.stringify({
        ItemId: itemId,
        MediaSourceId: mediaSourceId,
        AudioStreamIndex: options?.audioStreamIndex,
        SubtitleStreamIndex: options?.subtitleStreamIndex,
        PlayMethod: options?.isTranscoding ? 'DirectStream' : 'DirectPlay',
        PlaySessionId: playSessionId,
        CanSeek: true
      })
    });
  } catch (err) {
    console.warn('[Emby Session] Error reporting start:', err);
  }
}

/**
 * Reports playback progress ticks to Emby server.
 * Updates current playback position, play/pause state in Emby Dashboard in real time.
 */
export async function reportEmbyPlaybackProgress(
  settings: ServerSettings,
  itemId: string,
  mediaSourceId: string,
  playSessionId: string,
  positionSeconds: number,
  isPaused: boolean,
  options?: {
    audioStreamIndex?: number;
    subtitleStreamIndex?: number;
  }
): Promise<void> {
  if (!settings.apiKey) return;
  const baseUrl = settings.url.replace(/\/$/, '');
  const url = `${baseUrl}/Sessions/Playing/Progress?api_key=${encodeURIComponent(settings.apiKey)}`;
  const ticks = Math.floor(positionSeconds * 10000000);
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Token': settings.apiKey,
        'X-Emby-Device-Name': 'JEmby Cinema Player',
        'X-Emby-Device-Id': 'jemby-web-player'
      },
      body: JSON.stringify({
        ItemId: itemId,
        MediaSourceId: mediaSourceId,
        PositionTicks: ticks,
        IsPaused: isPaused,
        Event: isPaused ? 'Pause' : 'TimeUpdate',
        PlaySessionId: playSessionId,
        AudioStreamIndex: options?.audioStreamIndex,
        SubtitleStreamIndex: options?.subtitleStreamIndex
      })
    });
  } catch (err) {}
}

/**
 * Reports playback stopped to Emby server.
 * Closes the active session in Emby Dashboard and updates UserData resume progress.
 */
export async function reportEmbyPlaybackStopped(
  settings: ServerSettings,
  itemId: string,
  mediaSourceId: string,
  playSessionId: string,
  positionSeconds: number
): Promise<void> {
  if (!settings.apiKey) return;
  const baseUrl = settings.url.replace(/\/$/, '');
  const url = `${baseUrl}/Sessions/Playing/Stopped?api_key=${encodeURIComponent(settings.apiKey)}`;
  const ticks = Math.floor(positionSeconds * 10000000);
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Token': settings.apiKey,
        'X-Emby-Device-Name': 'JEmby Cinema Player',
        'X-Emby-Device-Id': 'jemby-web-player'
      },
      body: JSON.stringify({
        ItemId: itemId,
        MediaSourceId: mediaSourceId,
        PositionTicks: ticks,
        PlaySessionId: playSessionId
      })
    });
  } catch (err) {}
}

/**
 * Tests connection to an Emby or Jellyfin server.
 */
export async function testEmbyConnection(settings: ServerSettings): Promise<{ serverName: string; version: string }> {
  const baseUrl = settings.url.replace(/\/$/, '');
  const url = `${baseUrl}/System/Info?api_key=${encodeURIComponent(settings.apiKey)}`;
  
  const response = await fetch(url, {
    headers: {
      'X-Emby-Token': settings.apiKey,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Connection failed: HTTP ${response.status} ${response.statusText}`);
  }

  const info = await response.json();
  return {
    serverName: info.ServerName || 'Emby Server',
    version: info.Version || 'Unknown'
  };
}

/**
 * Shared metadata field list for Emby item queries.
 */
const EMBY_ITEM_FIELDS = [
  'PrimaryImageAspectRatio',
  'Overview',
  'BackdropImageTags',
  'Genres',
  'RunTimeTicks',
  'ProductionYear',
  'CommunityRating',
  'OfficialRating',
  'People',
  'MediaStreams',
  'UserData'
].join(',');

/**
 * Maps an Emby / Jellyfin item JSON to a standardized Movie object,
 * including high-fidelity subtitle stream tracks and resume playback position.
 */
export function mapEmbyItemToMovie(item: any, baseUrl: string, settings: ServerSettings): Movie {
  // Calculate runtime in minutes (RunTimeTicks is in 10,000s of a millisecond: 1 tick = 100ns)
  const runtimeMinutes = item.RunTimeTicks ? Math.floor(item.RunTimeTicks / 10000000 / 60) : 0;
  
  const posterUrl = item.ImageTags?.Primary 
    ? `${baseUrl}/Items/${item.Id}/Images/Primary?tag=${item.ImageTags.Primary}&quality=90` 
    : null;
    
  const backdropUrl = item.BackdropImageTags && item.BackdropImageTags.length > 0
    ? `${baseUrl}/Items/${item.Id}/Images/Backdrop?tag=${item.BackdropImageTags[0]}&quality=90&maxWidth=1920` 
    : null;

  // Parse Director & Actors from People list
  const director = item.People?.filter((p: any) => p.Type === 'Director').map((p: any) => p.Name).join(', ');
  const cast = item.People?.filter((p: any) => p.Type === 'Actor').slice(0, 6).map((p: any) => p.Name);

  // Parse MediaStreams for Resolution, HDR, Audio & Subtitles
  const streams = item.MediaStreams || [];
  const videoStream = streams.find((s: any) => s.Type === 'Video');
  const audioStreams = streams.filter((s: any) => s.Type === 'Audio');
  const subtitleStreams = streams.filter((s: any) => s.Type === 'Subtitle');

  let resolutionBadge = '1080p';
  if (videoStream) {
    const width = videoStream.Width || 0;
    const height = videoStream.Height || 0;
    if (width >= 3800 || height >= 2000) {
      resolutionBadge = '4K UHD';
    } else if (width >= 1900 || height >= 1000) {
      resolutionBadge = '1080p';
    } else if (width >= 1200 || height >= 700) {
      resolutionBadge = '720p';
    }
  }

  let hdrBadge: string | undefined = undefined;
  if (videoStream) {
    const range = (videoStream.VideoRange || '').toUpperCase();
    const title = (videoStream.DisplayTitle || '').toUpperCase();
    if (range.includes('DOVI') || title.includes('VISION')) {
      hdrBadge = 'Dolby Vision';
    } else if (range.includes('HDR10+') || title.includes('HDR10+')) {
      hdrBadge = 'HDR10+';
    } else if (range.includes('HDR') || title.includes('HDR')) {
      hdrBadge = 'HDR';
    }
  }

  // Audio track formats with codec & index details
  const audioTracks: AudioTrackInfo[] = audioStreams.slice(0, 6).map((a: any) => {
    const lang = (a.Language || 'ENG').toUpperCase();
    let format = a.Codec ? a.Codec.toUpperCase() : 'Stereo';
    if (format === 'AC3') format = 'Dolby 5.1';
    if (format === 'EAC3') format = 'Dolby Digital+';
    if (format === 'TRUEHD') format = 'Dolby Atmos / TrueHD';
    if (format.includes('DTS')) format = 'DTS:X';
    if (a.Channels === 6) format += ' 5.1';
    if (a.Channels === 8) format += ' 7.1';
    return { 
      lang, 
      format, 
      codec: (a.Codec || '').toLowerCase(), 
      index: a.Index, 
      channels: a.Channels,
      isDefault: !!a.IsDefault
    };
  });

  // Determine primary audio track
  const primaryAudio = audioTracks.find(a => a.isDefault) || audioTracks[0];
  const mediaSourceId = item.MediaSources?.[0]?.Id || item.Id;

  // Intelligently build video stream URL:
  // Check if primary audio requires AAC transcoding
  const needsAudioTranscode = primaryAudio?.codec ? !isAudioCodecSupported(primaryAudio.codec) : true;

  // If audio requires transcode, use HLS (master.m3u8) so browser can seek/scrub smoothly!
  // If native audio, use direct static stream
  const videoUrl = needsAudioTranscode
    ? buildEmbyHlsStreamUrl(baseUrl, item.Id, settings.apiKey, {
        mediaSourceId,
        audioStreamIndex: primaryAudio?.index,
        audioCodec: primaryAudio?.codec,
        channels: 2 // Stereo downmix guarantees dialogue in all browsers!
      })
    : buildEmbyStreamUrl(baseUrl, item.Id, settings.apiKey, {
        mediaSourceId,
        audioStreamIndex: primaryAudio?.index,
        audioCodec: primaryAudio?.codec,
        forceTranscodeAudio: false
      });

  // Extract complete SubtitleTrack objects with direct WebVTT stream URLs
  const subtitleTracks: SubtitleTrack[] = subtitleStreams.map((s: any, idx: number): SubtitleTrack => {
    const streamIndex = s.Index !== undefined ? s.Index : idx;
    const langCode = (s.Language || 'und').toLowerCase();
    const langName = s.Language ? s.Language.toUpperCase() : 'Unknown';
    const codec = (s.Codec || 'vtt').toLowerCase();
    const isText = !['pgssub', 'pgs', 'dvd_subtitle', 'vobsub'].includes(codec) && s.IsText !== false;
    
    let label = s.DisplayTitle || s.Title || `${langName} Subtitle`;
    if (!isText && !label.includes('PGS') && !label.includes('Bitmap')) {
      label += ' (Bitmap)';
    }
    
    // Official Emby endpoint: /Videos/{Id}/{MediaSourceId}/Subtitles/{Index}/0/Stream.vtt
    const vttUrl = `${baseUrl}/Videos/${item.Id}/${mediaSourceId}/Subtitles/${streamIndex}/0/Stream.vtt?api_key=${encodeURIComponent(settings.apiKey)}`;
    
    return {
      id: `sub-${item.Id}-${streamIndex}`,
      index: streamIndex,
      lang: langName,
      code: langCode,
      label: label,
      format: codec,
      url: vttUrl,
      isDefault: !!s.IsDefault,
      isText
    };
  });

  const subtitleLabels = subtitleTracks.map(t => t.label);

  // Incomplete playback data from Emby UserData
  let playbackPositionSeconds: number | undefined = undefined;
  let playbackPercentage: number | undefined = undefined;
  if (item.UserData) {
    if (item.UserData.PlaybackPositionTicks && item.UserData.PlaybackPositionTicks > 0) {
      playbackPositionSeconds = Math.floor(item.UserData.PlaybackPositionTicks / 10000000);
      
      const totalSeconds = item.RunTimeTicks ? Math.floor(item.RunTimeTicks / 10000000) : 0;
      if (item.UserData.PlayedPercentage) {
        playbackPercentage = Math.round(item.UserData.PlayedPercentage);
      } else if (totalSeconds > 0) {
        playbackPercentage = Math.min(100, Math.round((playbackPositionSeconds / totalSeconds) * 100));
      }
    }
  }

  return {
    id: item.Id,
    mediaSourceId,
    title: item.Name,
    year: item.ProductionYear,
    overview: item.Overview,
    runtime: runtimeMinutes,
    genres: item.Genres || [],
    poster: posterUrl,
    backdrop: backdropUrl,
    videoUrl: videoUrl,
    rating: item.CommunityRating ? Math.round(item.CommunityRating * 10) / 10 : undefined,
    contentRating: item.OfficialRating || undefined,
    director: director || undefined,
    cast: cast && cast.length > 0 ? cast : undefined,
    resolutionBadge,
    hdrBadge,
    audioTracks: audioTracks.length > 0 ? audioTracks : undefined,
    subtitles: subtitleLabels.length > 0 ? subtitleLabels : undefined,
    subtitleTracks: subtitleTracks.length > 0 ? subtitleTracks : undefined,
    playbackPositionSeconds,
    playbackPercentage,
    lastWatchedAt: item.UserData?.LastPlayedDate ? new Date(item.UserData.LastPlayedDate).getTime() : undefined
  };
}

/**
 * Fetches movies from an Emby or Jellyfin server using its REST API.
 */
export async function fetchEmbyMovies(settings: ServerSettings): Promise<Movie[]> {
  try {
    const baseUrl = settings.url.replace(/\/$/, '');
    
    // Add Limit=2000 to prevent Emby from truncating at default page size
    let url = `${baseUrl}/Items?IncludeItemTypes=Movie&Recursive=true&Limit=2000&Fields=${EMBY_ITEM_FIELDS}&SortBy=SortName&api_key=${encodeURIComponent(settings.apiKey)}`;
    
    let response = await fetch(url, {
      headers: {
        'X-Emby-Token': settings.apiKey,
        'Accept': 'application/json'
      }
    });
    
    // If standard global Items fails or returns 0, try fetching through active Emby users
    let data = response.ok ? await response.json() : null;
    
    if (!data || !data.Items || data.Items.length === 0) {
      try {
        const usersRes = await fetch(`${baseUrl}/Users?api_key=${encodeURIComponent(settings.apiKey)}`, {
          headers: { 'X-Emby-Token': settings.apiKey, 'Accept': 'application/json' }
        });
        if (usersRes.ok) {
          const users = await usersRes.json();
          if (Array.isArray(users) && users.length > 0) {
            const userId = users[0].Id;
            const userUrl = `${baseUrl}/Users/${userId}/Items?IncludeItemTypes=Movie&Recursive=true&Limit=2000&Fields=${EMBY_ITEM_FIELDS}&SortBy=SortName&api_key=${encodeURIComponent(settings.apiKey)}`;
            const userResponse = await fetch(userUrl, {
              headers: { 'X-Emby-Token': settings.apiKey, 'Accept': 'application/json' }
            });
            if (userResponse.ok) {
              data = await userResponse.json();
            }
          }
        }
      } catch (userErr) {
        console.warn("User fallback query check skipped:", userErr);
      }
    }

    if (!data || !data.Items || !Array.isArray(data.Items)) {
      if (response && !response.ok) {
        throw new Error(`Emby API error: ${response.status} ${response.statusText}`);
      }
      return [];
    }

    console.log(`Successfully loaded ${data.Items.length} movies from Emby server.`);

    return data.Items.map((item: any): Movie => mapEmbyItemToMovie(item, baseUrl, settings));
  } catch (error) {
    console.error("Failed to fetch from Emby:", error);
    throw error;
  }
}

/**
 * Fetches Incomplete Playback (Continue Watching) items from Emby/Jellyfin.
 */
export async function fetchEmbyResumeItems(settings: ServerSettings): Promise<Movie[]> {
  try {
    const baseUrl = settings.url.replace(/\/$/, '');

    // Step 1: Identify active user accounts on the server
    let userId = '';
    try {
      const usersRes = await fetch(`${baseUrl}/Users?api_key=${encodeURIComponent(settings.apiKey)}`, {
        headers: { 'X-Emby-Token': settings.apiKey, 'Accept': 'application/json' }
      });
      if (usersRes.ok) {
        const users = await usersRes.json();
        if (Array.isArray(users) && users.length > 0) {
          userId = users[0].Id;
        }
      }
    } catch (e) {
      console.warn("Could not query Emby user accounts for resume items:", e);
    }

    let resumeItems: any[] = [];

    // Method A: Official /Users/{userId}/Items/Resume endpoint
    if (userId) {
      try {
        const resumeUrl = `${baseUrl}/Users/${userId}/Items/Resume?Limit=20&Fields=${EMBY_ITEM_FIELDS}&api_key=${encodeURIComponent(settings.apiKey)}`;
        const res = await fetch(resumeUrl, {
          headers: { 'X-Emby-Token': settings.apiKey, 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.Items) && data.Items.length > 0) {
            resumeItems = data.Items;
          }
        }
      } catch (err) {
        console.warn("Error fetching /Users/{id}/Items/Resume:", err);
      }
    }

    // Method B: Fallback to global Items with Filters=IsResumable
    if (resumeItems.length === 0) {
      try {
        const userQuery = userId ? `&UserId=${userId}` : '';
        const fallbackUrl = `${baseUrl}/Items?Filters=IsResumable&Recursive=true&Limit=20&Fields=${EMBY_ITEM_FIELDS}${userQuery}&api_key=${encodeURIComponent(settings.apiKey)}`;
        const res = await fetch(fallbackUrl, {
          headers: { 'X-Emby-Token': settings.apiKey, 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.Items)) {
            resumeItems = data.Items;
          }
        }
      } catch (err) {
        console.warn("Error fetching Items with Filters=IsResumable:", err);
      }
    }

    // Filter to ensure only items with genuine incomplete progress
    const validResume = resumeItems.filter((item: any) => {
      const positionTicks = item.UserData?.PlaybackPositionTicks || 0;
      const isPlayed = item.UserData?.Played === true;
      return positionTicks > 0 && !isPlayed;
    });

    console.log(`Loaded ${validResume.length} Continue Watching items from Emby server.`);
    return validResume.map((item: any) => mapEmbyItemToMovie(item, baseUrl, settings));
  } catch (error) {
    console.error("Failed to fetch Emby resume items:", error);
    return [];
  }
}

/**
 * Converts an Episode object into a Movie-compatible object for the universal VideoPlayer.
 */
export function episodeToPlayableMovie(episode: Episode): Movie {
  const padSeason = episode.seasonNumber.toString().padStart(2, '0');
  const padEpisode = episode.episodeNumber.toString().padStart(2, '0');
  return {
    id: episode.id,
    mediaSourceId: episode.mediaSourceId || episode.id,
    title: `${episode.seriesName} • S${padSeason}E${padEpisode} "${episode.title}"`,
    overview: episode.overview,
    runtime: episode.runtime,
    poster: episode.thumb,
    backdrop: episode.thumb,
    videoUrl: episode.videoUrl,
    rating: episode.rating,
    resolutionBadge: episode.resolutionBadge,
    hdrBadge: episode.hdrBadge,
    audioTracks: episode.audioTracks,
    subtitles: episode.subtitles,
    subtitleTracks: episode.subtitleTracks,
    playbackPositionSeconds: episode.playbackPositionSeconds,
    playbackPercentage: episode.playbackPercentage,
    lastWatchedAt: episode.lastWatchedAt
  };
}

/**
 * Fetches all TV Shows (Series) from the Emby server.
 */
export async function fetchEmbyTvShows(settings: ServerSettings): Promise<TvShow[]> {
  try {
    const baseUrl = settings.url.replace(/\/$/, '');
    const url = `${baseUrl}/Items?IncludeItemTypes=Series&Recursive=true&Limit=1000&Fields=${EMBY_ITEM_FIELDS}&SortBy=SortName&api_key=${encodeURIComponent(settings.apiKey)}`;
    
    const response = await fetch(url, {
      headers: {
        'X-Emby-Token': settings.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data || !Array.isArray(data.Items)) return [];

    return data.Items.map((item: any): TvShow => {
      const posterUrl = item.ImageTags?.Primary 
        ? `${baseUrl}/Items/${item.Id}/Images/Primary?tag=${item.ImageTags.Primary}&quality=90` 
        : null;
        
      const backdropUrl = item.BackdropImageTags && item.BackdropImageTags.length > 0
        ? `${baseUrl}/Items/${item.Id}/Images/Backdrop?tag=${item.BackdropImageTags[0]}&quality=90&maxWidth=1920` 
        : null;

      const cast = item.People?.filter((p: any) => p.Type === 'Actor').slice(0, 6).map((p: any) => p.Name);

      return {
        id: item.Id,
        title: item.Name,
        year: item.ProductionYear,
        overview: item.Overview,
        poster: posterUrl,
        backdrop: backdropUrl,
        rating: item.CommunityRating ? Math.round(item.CommunityRating * 10) / 10 : undefined,
        contentRating: item.OfficialRating,
        genres: item.Genres || [],
        status: item.Status,
        seasonsCount: item.ChildCount || undefined,
        episodesCount: item.RecursiveItemCount || undefined,
        cast: cast && cast.length > 0 ? cast : undefined
      };
    });
  } catch (err) {
    console.error("Failed to fetch Emby TV shows:", err);
    return [];
  }
}

/**
 * Fetches all Seasons for a specific TV Show (Series).
 */
export async function fetchEmbySeasons(settings: ServerSettings, seriesId: string): Promise<Season[]> {
  try {
    const baseUrl = settings.url.replace(/\/$/, '');
    const url = `${baseUrl}/Shows/${seriesId}/Seasons?Fields=${EMBY_ITEM_FIELDS}&api_key=${encodeURIComponent(settings.apiKey)}`;

    const res = await fetch(url, {
      headers: {
        'X-Emby-Token': settings.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!data || !Array.isArray(data.Items)) return [];

    return data.Items.map((item: any): Season => {
      const posterUrl = item.ImageTags?.Primary 
        ? `${baseUrl}/Items/${item.Id}/Images/Primary?tag=${item.ImageTags.Primary}&quality=90` 
        : null;

      return {
        id: item.Id,
        seriesId,
        seriesName: item.SeriesName,
        name: item.Name || `Season ${item.IndexNumber || 1}`,
        seasonNumber: item.IndexNumber !== undefined ? item.IndexNumber : 1,
        poster: posterUrl,
        episodesCount: item.ChildCount
      };
    });
  } catch (err) {
    console.error(`Failed to fetch seasons for series ${seriesId}:`, err);
    return [];
  }
}

/**
 * Fetches Episodes for a specific TV Show and optional Season.
 */
export async function fetchEmbyEpisodes(
  settings: ServerSettings, 
  seriesId: string, 
  seasonId?: string
): Promise<Episode[]> {
  try {
    const baseUrl = settings.url.replace(/\/$/, '');
    const seasonQuery = seasonId ? `&seasonId=${seasonId}` : '';
    const url = `${baseUrl}/Shows/${seriesId}/Episodes?Fields=${EMBY_ITEM_FIELDS}${seasonQuery}&api_key=${encodeURIComponent(settings.apiKey)}`;

    const res = await fetch(url, {
      headers: {
        'X-Emby-Token': settings.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!data || !Array.isArray(data.Items)) return [];

    return data.Items.map((item: any): Episode => {
      const thumbUrl = item.ImageTags?.Primary 
        ? `${baseUrl}/Items/${item.Id}/Images/Primary?tag=${item.ImageTags.Primary}&quality=90&maxWidth=720` 
        : null;

      const runtimeMinutes = item.RunTimeTicks ? Math.floor(item.RunTimeTicks / 10000000 / 60) : 0;

      // Streams & codecs
      const streams = item.MediaStreams || [];
      const videoStream = streams.find((s: any) => s.Type === 'Video');
      const audioStreams = streams.filter((s: any) => s.Type === 'Audio');
      const subtitleStreams = streams.filter((s: any) => s.Type === 'Subtitle');

      let resolutionBadge = '1080p';
      if (videoStream) {
        const width = videoStream.Width || 0;
        if (width >= 3800) resolutionBadge = '4K UHD';
        else if (width >= 1900) resolutionBadge = '1080p';
        else if (width >= 1200) resolutionBadge = '720p';
      }

      let hdrBadge: string | undefined = undefined;
      if (videoStream) {
        const range = (videoStream.VideoRange || '').toUpperCase();
        if (range.includes('DOVI')) hdrBadge = 'Dolby Vision';
        else if (range.includes('HDR')) hdrBadge = 'HDR';
      }

      const audioTracks: AudioTrackInfo[] = audioStreams.map((a: any) => ({
        lang: (a.Language || 'ENG').toUpperCase(),
        format: a.Codec ? a.Codec.toUpperCase() : 'Stereo',
        codec: (a.Codec || '').toLowerCase(),
        index: a.Index,
        channels: a.Channels,
        isDefault: !!a.IsDefault
      }));

      const primaryAudio = audioTracks.find(a => a.isDefault) || audioTracks[0];
      const mediaSourceId = item.MediaSources?.[0]?.Id || item.Id;

      const needsAudioTranscode = primaryAudio?.codec ? !isAudioCodecSupported(primaryAudio.codec) : true;
      const videoUrl = needsAudioTranscode
        ? buildEmbyHlsStreamUrl(baseUrl, item.Id, settings.apiKey, {
            mediaSourceId,
            audioStreamIndex: primaryAudio?.index,
            audioCodec: primaryAudio?.codec,
            channels: 2
          })
        : buildEmbyStreamUrl(baseUrl, item.Id, settings.apiKey, {
            mediaSourceId,
            audioStreamIndex: primaryAudio?.index,
            audioCodec: primaryAudio?.codec,
            forceTranscodeAudio: false
          });

      const subtitleTracks: SubtitleTrack[] = subtitleStreams.map((s: any, idx: number) => {
        const streamIndex = s.Index !== undefined ? s.Index : idx;
        const langName = s.Language ? s.Language.toUpperCase() : 'Unknown';
        const codec = (s.Codec || 'vtt').toLowerCase();
        const isText = !['pgssub', 'pgs', 'dvd_subtitle', 'vobsub'].includes(codec) && s.IsText !== false;
        const vttUrl = `${baseUrl}/Videos/${item.Id}/${mediaSourceId}/Subtitles/${streamIndex}/0/Stream.vtt?api_key=${encodeURIComponent(settings.apiKey)}`;
        return {
          id: `sub-${item.Id}-${streamIndex}`,
          index: streamIndex,
          lang: langName,
          label: s.DisplayTitle || `${langName} Subtitle`,
          format: codec,
          url: vttUrl,
          isDefault: !!s.IsDefault,
          isText
        };
      });

      let playbackPositionSeconds: number | undefined = undefined;
      let playbackPercentage: number | undefined = undefined;
      if (item.UserData?.PlaybackPositionTicks) {
        playbackPositionSeconds = Math.floor(item.UserData.PlaybackPositionTicks / 10000000);
        const totalSeconds = item.RunTimeTicks ? Math.floor(item.RunTimeTicks / 10000000) : 0;
        if (totalSeconds > 0) {
          playbackPercentage = Math.min(100, Math.round((playbackPositionSeconds / totalSeconds) * 100));
        }
      }

      return {
        id: item.Id,
        seriesId,
        seriesName: item.SeriesName || 'TV Show',
        seasonId: item.SeasonId || seasonId || '',
        seasonName: item.SeasonName || `Season ${item.ParentIndexNumber || 1}`,
        seasonNumber: item.ParentIndexNumber !== undefined ? item.ParentIndexNumber : 1,
        episodeNumber: item.IndexNumber !== undefined ? item.IndexNumber : 1,
        title: item.Name || `Episode ${item.IndexNumber || 1}`,
        overview: item.Overview,
        runtime: runtimeMinutes,
        thumb: thumbUrl,
        videoUrl,
        mediaSourceId,
        rating: item.CommunityRating,
        resolutionBadge,
        hdrBadge,
        audioTracks: audioTracks.length > 0 ? audioTracks : undefined,
        subtitles: subtitleTracks.map(t => t.label),
        subtitleTracks: subtitleTracks.length > 0 ? subtitleTracks : undefined,
        playbackPositionSeconds,
        playbackPercentage,
        lastWatchedAt: item.UserData?.LastPlayedDate ? new Date(item.UserData.LastPlayedDate).getTime() : undefined
      };
    });
  } catch (err) {
    console.error(`Failed to fetch episodes for series ${seriesId}:`, err);
    return [];
  }
}

/**
 * Reports playback progress back to the Emby server so the server tracks position.
 */
export async function reportPlaybackProgress(
  settings: ServerSettings, 
  movieId: string, 
  positionSeconds: number, 
  isPaused: boolean
): Promise<void> {
  if (!settings.url || !settings.apiKey || !movieId) return;
  try {
    const baseUrl = settings.url.replace(/\/$/, '');
    const ticks = Math.floor(positionSeconds * 10000000);
    const progressUrl = `${baseUrl}/Sessions/Playing/Progress?api_key=${encodeURIComponent(settings.apiKey)}`;
    
    await fetch(progressUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Token': settings.apiKey
      },
      body: JSON.stringify({
        ItemId: movieId,
        PositionTicks: ticks,
        IsPaused: isPaused,
        PlayMethod: 'DirectStream'
      })
    });
  } catch (e) {
    // Non-fatal if server reporting drops out
  }
}


