import { Movie, ServerSettings } from '../types';

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
 * Fetches movies from an Emby or Jellyfin server using its REST API.
 * Compatible with Emby Server (including local LAN like 192.168.10.146:8096) and Jellyfin.
 */
export async function fetchEmbyMovies(settings: ServerSettings): Promise<Movie[]> {
  try {
    const baseUrl = settings.url.replace(/\/$/, '');
    
    // Request full metadata fields: CommunityRating, OfficialRating, People, MediaStreams
    const fields = [
      'PrimaryImageAspectRatio',
      'Overview',
      'BackdropImageTags',
      'Genres',
      'RunTimeTicks',
      'ProductionYear',
      'CommunityRating',
      'OfficialRating',
      'People',
      'MediaStreams'
    ].join(',');

    const url = `${baseUrl}/Items?IncludeItemTypes=Movie&Recursive=true&Fields=${fields}&SortBy=SortName&api_key=${encodeURIComponent(settings.apiKey)}`;
    
    const response = await fetch(url, {
      headers: {
        'X-Emby-Token': settings.apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Emby API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.Items || !Array.isArray(data.Items)) {
      return [];
    }
    
    return data.Items.map((item: any): Movie => {
      // Calculate runtime in minutes (RunTimeTicks is in 10,000s of a millisecond)
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

      // Parse MediaStreams for Resolution & HDR
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
      const audioTracks = audioStreams.slice(0, 3).map((a: any) => {
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

      const subtitles = subtitleStreams
        .map((s: any) => (s.Language || 'ENG').toUpperCase())
        .filter((val: string, idx: number, arr: string[]) => arr.indexOf(val) === idx)
        .slice(0, 4);

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
        subtitles: subtitles.length > 0 ? subtitles : undefined
      };
    });
  } catch (error) {
    console.error("Failed to fetch from Emby:", error);
    throw error;
  }
}

