import { Movie, ServerSettings, SubtitleTrack } from '../types';

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

  // Direct video stream URL from Emby (Static=true for direct file stream or standard container)
  const videoUrl = `${baseUrl}/Videos/${item.Id}/stream.mp4?Static=true&api_key=${encodeURIComponent(settings.apiKey)}`;

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

  // Audio track formats
  const audioTracks = audioStreams.slice(0, 4).map((a: any) => {
    const lang = (a.Language || 'ENG').toUpperCase();
    let format = a.Codec ? a.Codec.toUpperCase() : 'Stereo';
    if (format === 'AC3') format = 'Dolby 5.1';
    if (format === 'EAC3') format = 'Dolby Digital+';
    if (format === 'TRUEHD') format = 'Dolby Atmos / TrueHD';
    if (format.includes('DTS')) format = 'DTS:X';
    if (a.Channels === 6) format += ' 5.1';
    if (a.Channels === 8) format += ' 7.1';
    return { lang, format };
  });

  // Extract complete SubtitleTrack objects with direct WebVTT stream URLs
  const subtitleTracks: SubtitleTrack[] = subtitleStreams.map((s: any, idx: number): SubtitleTrack => {
    const streamIndex = s.Index !== undefined ? s.Index : idx;
    const langCode = (s.Language || 'und').toLowerCase();
    const langName = s.Language ? s.Language.toUpperCase() : 'Unknown';
    const label = s.DisplayTitle || s.Title || `${langName} Subtitle`;
    
    // Emby serves WebVTT for any subtitle track via Stream.vtt endpoint
    const vttUrl = `${baseUrl}/Videos/${item.Id}/Subtitles/${streamIndex}/Stream.vtt?api_key=${encodeURIComponent(settings.apiKey)}`;
    
    return {
      id: `sub-${item.Id}-${streamIndex}`,
      index: streamIndex,
      lang: langName,
      code: langCode,
      label: label,
      format: (s.Codec || 'vtt').toLowerCase(),
      url: vttUrl,
      isDefault: !!s.IsDefault
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


