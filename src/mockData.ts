import { Movie, TvShow, Episode, Season } from './types';

export const MOCK_MOVIES: Movie[] = [
  {
    id: '1',
    title: 'Interstellar Odyssey',
    year: 2024,
    overview: 'A breathtaking journey through the cosmos as humanity seeks a new home beyond the stars. Set more than a decade after the events of the first film, learn the story of the Nephylis family, the trouble that follows them, the lengths they go to keep each other safe, the battles they fight to stay alive, and the tragedies they endure.',
    runtime: 145,
    genres: ['Sci-Fi', 'Adventure', 'Drama'],
    poster: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1920&q=80',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    rating: 7.1,
    contentRating: '16+',
    director: 'James Jameson',
    cast: ['Sam Worthing', 'Zoe Weaver', 'Stephen Saldaña', 'Kate Lang', 'John Winslet']
  },
  {
    id: '2',
    title: 'Neon Nights',
    year: 2023,
    overview: 'In a dystopian metropolis, a rogue detective uncovers a conspiracy that threatens the entire city.',
    runtime: 112,
    genres: ['Action', 'Thriller', 'Sci-Fi'],
    poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1920&q=80',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    rating: 6.8,
    contentRating: '18+',
    director: 'Elena Rostova',
    cast: ['Michael Trent', 'Sarah Connor']
  },
  {
    id: '3',
    title: 'The Silent Peak',
    year: 2022,
    overview: 'An expedition to an uncharted mountain range turns into a desperate fight for survival against the elements.',
    runtime: 128,
    genres: ['Thriller', 'Adventure'],
    poster: 'https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    rating: 8.2,
    contentRating: '13+',
    director: 'Alan Smithee',
    cast: ['John Doe', 'Jane Doe']
  },
  {
    id: '4',
    title: 'Desert Mirage',
    year: 2025,
    overview: 'A lone traveler navigates a vast, magical desert, searching for an ancient artifact.',
    runtime: 95,
    genres: ['Fantasy', 'Adventure'],
    poster: 'https://images.unsplash.com/photo-1542314831-c5a4d407e201?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&w=1920&q=80',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    rating: 5.5,
    contentRating: 'PG',
    director: 'Jane Smith',
    cast: ['Actor One', 'Actor Two']
  },
  {
    id: '5',
    title: 'Ocean Deep',
    year: 2021,
    overview: 'Explore the uncharted depths of the ocean and discover the mysteries lurking in the abyss.',
    runtime: 104,
    genres: ['Documentary', 'Nature'],
    poster: 'https://images.unsplash.com/photo-1518467166778-b88f373ff255?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?auto=format&fit=crop&w=1920&q=80',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    rating: 9.0,
    contentRating: 'G',
    director: 'Jacques Cousteau II',
    cast: ['Narrator']
  },
  {
    id: '6',
    title: 'Quantum Paradox',
    year: 2026,
    overview: 'Scientists accidentally create a rift in spacetime, forcing them to navigate alternate realities to fix it.',
    runtime: 135,
    genres: ['Sci-Fi', 'Mystery'],
    poster: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    rating: 7.8,
    contentRating: '16+',
    director: 'Christopher Nolan III',
    cast: ['Lead Actor', 'Supporting Actress']
  }
];

export const MOCK_TV_SHOWS: TvShow[] = [
  {
    id: 'tv-1',
    title: 'Chronicles of the Cosmos',
    year: 2024,
    overview: 'An epic space odyssey across uncharted galaxies, exploring forgotten civilizations, planetary conflicts, and the mysterious origins of cosmic anomalies.',
    poster: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80',
    rating: 8.9,
    contentRating: 'TV-MA',
    genres: ['Sci-Fi', 'Drama', 'Adventure'],
    status: 'Continuing',
    seasonsCount: 2,
    episodesCount: 16,
    cast: ['Marcus Sterling', 'Elena Rostova', 'Dr. Aris Vance', 'Kaelen Thorne']
  },
  {
    id: 'tv-2',
    title: 'Shadows of Neo-Tokyo',
    year: 2023,
    overview: 'In a rain-soaked cyberpunk metropolis, an augmented detective and an underground hacker unravel an insidious corporate conspiracy that threatens human consciousness.',
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80',
    rating: 8.6,
    contentRating: 'TV-14',
    genres: ['Cyberpunk', 'Action', 'Thriller'],
    status: 'Continuing',
    seasonsCount: 2,
    episodesCount: 18,
    cast: ['Kenji Sato', 'Maya Lin', 'Cyrus Vance', 'Aoi Tanaka']
  },
  {
    id: 'tv-3',
    title: 'The Alchemist Kingdom',
    year: 2022,
    overview: 'Magic, betrayal, and forgotten alchemy collide in a shattered empire where ancient elemental guilds fight for supremacy over the crystal throne.',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80',
    rating: 8.4,
    contentRating: 'TV-MA',
    genres: ['Fantasy', 'Adventure', 'Mystery'],
    status: 'Ended',
    seasonsCount: 3,
    episodesCount: 24,
    cast: ['Lord Varis', 'Seraphina Vale', 'Brom the Blacksmith', 'Princess Lyra']
  },
  {
    id: 'tv-4',
    title: 'Deep Horizon Expedition',
    year: 2025,
    overview: 'A deep-sea scientific research team discovers an alien biosphere thriving under miles of volcanic ice at the bottom of the Mariana Trench.',
    poster: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?auto=format&fit=crop&w=1920&q=80',
    rating: 8.1,
    contentRating: 'TV-14',
    genres: ['Sci-Fi', 'Mystery', 'Thriller'],
    status: 'Continuing',
    seasonsCount: 1,
    episodesCount: 8,
    cast: ['Dr. Sarah Chen', 'Commander Hayes', 'Dr. Noah Bell', 'Leila Ramos']
  }
];

export function getMockSeasonsForSeries(seriesId: string): Season[] {
  const show = MOCK_TV_SHOWS.find(s => s.id === seriesId) || MOCK_TV_SHOWS[0];
  const count = show.seasonsCount || 2;
  return Array.from({ length: count }, (_, i) => ({
    id: `season-${seriesId}-${i + 1}`,
    seriesId,
    seriesName: show.title,
    name: `Season ${i + 1}`,
    seasonNumber: i + 1,
    poster: show.poster,
    episodesCount: 8
  }));
}

export function getMockEpisodesForSeries(seriesId: string, seasonNumber: number = 1): Episode[] {
  const show = MOCK_TV_SHOWS.find(s => s.id === seriesId) || MOCK_TV_SHOWS[0];
  const sampleVideos = [
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  ];

  const episodeTitles = [
    'Arrival at the Frontier',
    'Echoes of the Void',
    'The Ghost Signal',
    'Fractured Horizons',
    'Trial by Fire',
    'Into the Maelstrom',
    'The Hidden Gateway',
    'Convergence'
  ];

  return episodeTitles.map((title, idx) => {
    const epNum = idx + 1;
    return {
      id: `ep-${seriesId}-s${seasonNumber}-e${epNum}`,
      seriesId,
      seriesName: show.title,
      seasonId: `season-${seriesId}-${seasonNumber}`,
      seasonName: `Season ${seasonNumber}`,
      seasonNumber,
      episodeNumber: epNum,
      title,
      overview: `In this gripping chapter of ${show.title}, the crew confronts unexpected revelations that test their loyalties and push their technology beyond its limits.`,
      runtime: 48 + (epNum * 3) % 15,
      thumb: show.backdrop || show.poster,
      videoUrl: sampleVideos[idx % sampleVideos.length],
      rating: Math.round((8.0 + (epNum % 3) * 0.4) * 10) / 10,
      resolutionBadge: '4K UHD',
      hdrBadge: 'HDR',
      audioTracks: [
        { lang: 'ENG', format: 'Dolby Atmos 5.1', codec: 'eac3', isDefault: true, channels: 6 },
        { lang: 'ENG', format: 'Stereo AAC', codec: 'aac', channels: 2 }
      ],
      subtitles: ['English [CC]', 'Spanish', 'French'],
      subtitleTracks: [
        { id: `sub-eng-${epNum}`, lang: 'ENG', label: 'English [CC]', isDefault: true, isText: true }
      ]
    };
  });
}

