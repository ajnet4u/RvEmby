import React, { useState, useEffect } from 'react';
import { TvShow, Season, Episode, ServerSettings } from '../types';
import { fetchEmbySeasons, fetchEmbyEpisodes } from '../api/emby';
import { getMockSeasonsForSeries, getMockEpisodesForSeries } from '../mockData';
import { motion, AnimatePresence } from 'motion/react';
import { Play, ArrowLeft, Star, Clock, Calendar, Film, Layers, CheckCircle2, Tv } from 'lucide-react';

interface TvShowDetailsProps {
  show: TvShow;
  settings: ServerSettings;
  isConnected: boolean;
  onClose: () => void;
  onPlayEpisode: (episode: Episode) => void;
}

export function TvShowDetails({
  show,
  settings,
  isConnected,
  onClose,
  onPlayEpisode
}: TvShowDetailsProps) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // Load Seasons on mount
  useEffect(() => {
    let isMounted = true;
    async function loadSeasons() {
      if (isConnected && settings.url && settings.apiKey) {
        try {
          const embySeasons = await fetchEmbySeasons(settings, show.id);
          if (isMounted && embySeasons.length > 0) {
            setSeasons(embySeasons);
            setSelectedSeasonNumber(embySeasons[0].seasonNumber);
            return;
          }
        } catch (e) {
          console.warn("Failed to load Emby seasons, using fallback:", e);
        }
      }
      if (isMounted) {
        const fallbackSeasons = getMockSeasonsForSeries(show.id);
        setSeasons(fallbackSeasons);
        setSelectedSeasonNumber(fallbackSeasons[0]?.seasonNumber || 1);
      }
    }
    loadSeasons();
    return () => { isMounted = false; };
  }, [show.id, isConnected, settings]);

  // Load Episodes when selected season changes
  useEffect(() => {
    let isMounted = true;
    async function loadEpisodes() {
      setLoadingEpisodes(true);
      if (isConnected && settings.url && settings.apiKey) {
        try {
          const activeSeason = seasons.find(s => s.seasonNumber === selectedSeasonNumber);
          const embyEpisodes = await fetchEmbyEpisodes(settings, show.id, activeSeason?.id);
          if (isMounted && embyEpisodes.length > 0) {
            setEpisodes(embyEpisodes);
            setLoadingEpisodes(false);
            return;
          }
        } catch (e) {
          console.warn("Failed to load Emby episodes, using fallback:", e);
        }
      }
      if (isMounted) {
        const mockEps = getMockEpisodesForSeries(show.id, selectedSeasonNumber);
        setEpisodes(mockEps);
        setLoadingEpisodes(false);
      }
    }
    loadEpisodes();
    return () => { isMounted = false; };
  }, [show.id, selectedSeasonNumber, seasons, isConnected, settings]);

  // Primary action episode (first episode or next unfinished)
  const primaryEpisode = episodes.find(e => (e.playbackPercentage || 0) < 90) || episodes[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-tv-modal="true"
        className="fixed inset-0 z-40 bg-black flex text-white overflow-hidden"
      >
        {/* Series Backdrop */}
        {show.backdrop && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-md scale-105 pointer-events-none transition-all duration-700"
            style={{ backgroundImage: `url(${show.backdrop})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/60 pointer-events-none" />

        {/* Content Container */}
        <div className="relative z-10 flex-1 flex flex-col h-full overflow-y-auto hide-scrollbar p-6 md:p-12 lg:p-14">
          {/* Top Bar Navigation */}
          <div className="mb-6 flex items-center justify-between">
            <button
              data-tv-focus="true"
              onClick={onClose}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group focus:outline-none focus:ring-4 focus:ring-cyan-400 focus:scale-105 rounded-full px-2 py-1"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors backdrop-blur-md">
                <ArrowLeft size={20} />
              </div>
              <span className="text-sm font-semibold tracking-wider uppercase hidden sm:inline">Back (Esc)</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
              <Tv size={14} />
              <span>TV Series</span>
            </div>
          </div>

          {/* Series Hero Section */}
          <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start mb-10">
            {/* Poster Card */}
            <div className="shrink-0 w-48 sm:w-60 md:w-72 aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] border-2 border-white/15 relative group">
              {show.poster ? (
                <img src={show.poster} alt={show.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                  <Film size={48} className="text-white/20" />
                </div>
              )}
            </div>

            {/* Info & Metadata */}
            <div className="flex-1 flex flex-col justify-center">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-3 drop-shadow-md">
                {show.title}
              </h1>

              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm font-medium text-white/80 mb-4">
                {show.rating && (
                  <div className="flex items-center gap-1 text-amber-400 font-bold bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                    <Star size={15} fill="currentColor" />
                    <span>{show.rating.toFixed(1)}</span>
                  </div>
                )}
                {show.year && (
                  <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
                    {show.year}
                  </span>
                )}
                {show.status && (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 uppercase tracking-wider text-[11px] font-bold">
                    {show.status}
                  </span>
                )}
                {show.contentRating && (
                  <span className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white/90 font-bold text-[11px]">
                    {show.contentRating}
                  </span>
                )}
                {show.seasonsCount && (
                  <span className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs">
                    {show.seasonsCount} {show.seasonsCount === 1 ? 'Season' : 'Seasons'}
                  </span>
                )}
              </div>

              {/* Genres */}
              {show.genres && show.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {show.genres.map(genre => (
                    <span 
                      key={genre}
                      className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 text-xs"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Overview */}
              <p className="text-white/75 text-sm sm:text-base leading-relaxed max-w-3xl mb-6">
                {show.overview || 'No overview available for this series.'}
              </p>

              {/* Cast */}
              {show.cast && show.cast.length > 0 && (
                <div className="text-xs text-white/60 mb-6">
                  <span className="text-white/40 font-semibold uppercase tracking-wider mr-2">Starring:</span>
                  {show.cast.join(', ')}
                </div>
              )}

              {/* Hero Action: Play first / resume next episode */}
              {primaryEpisode && (
                <div>
                  <button
                    autoFocus
                    data-tv-focus="true"
                    onClick={() => onPlayEpisode(primaryEpisode)}
                    className="flex items-center gap-3 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base shadow-[0_0_25px_rgba(6,182,212,0.6)] focus:outline-none focus:ring-4 focus:ring-cyan-300 transform focus:scale-105 transition-all cursor-pointer"
                  >
                    <Play fill="currentColor" size={20} />
                    <span>
                      {primaryEpisode.playbackPositionSeconds && primaryEpisode.playbackPositionSeconds > 20
                        ? `Resume S${primaryEpisode.seasonNumber}:E${primaryEpisode.episodeNumber}`
                        : `Play S${primaryEpisode.seasonNumber}:E${primaryEpisode.episodeNumber} "${primaryEpisode.title}"`
                      }
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Season Selector Tabs */}
          <div className="mb-6 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <Layers size={18} className="text-cyan-400" />
              <h2 className="text-lg font-bold tracking-wide uppercase text-white">Seasons</h2>
            </div>
            <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1">
              {seasons.map((season) => {
                const isActive = season.seasonNumber === selectedSeasonNumber;
                return (
                  <button
                    key={season.id}
                    data-tv-focus="true"
                    onClick={() => setSelectedSeasonNumber(season.seasonNumber)}
                    className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide uppercase transition-all shrink-0 focus:outline-none focus:ring-4 focus:ring-cyan-400 focus:scale-105 ${
                      isActive
                        ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                        : 'bg-white/10 hover:bg-white/20 text-white/80'
                    }`}
                  >
                    {season.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Episode List */}
          <div className="flex-1">
            <h3 className="text-base font-bold uppercase tracking-wider text-white/60 mb-4">
              Season {selectedSeasonNumber} Episodes ({episodes.length})
            </h3>

            {loadingEpisodes ? (
              <div className="flex items-center justify-center py-16 text-white/50 text-sm">
                <span>Loading episodes...</span>
              </div>
            ) : episodes.length === 0 ? (
              <div className="text-white/40 text-sm py-10">No episodes found for this season.</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-12">
                {episodes.map((ep) => {
                  const epNumberFormatted = `E${ep.episodeNumber.toString().padStart(2, '0')}`;
                  return (
                    <motion.div
                      key={ep.id}
                      tabIndex={0}
                      data-tv-focus="true"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => onPlayEpisode(ep)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onPlayEpisode(ep);
                        }
                      }}
                      className="group relative flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/10 hover:border-cyan-400/80 focus:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-400 focus:scale-[1.02] shadow-lg transition-all duration-300 cursor-pointer backdrop-blur-md"
                    >
                      {/* Episode Thumbnail */}
                      <div className="shrink-0 w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-black/60 relative border border-white/15">
                        {ep.thumb ? (
                          <img src={ep.thumb} alt={ep.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/30">
                            <Tv size={28} />
                          </div>
                        )}

                        {/* Play Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                          <div className="w-12 h-12 rounded-full bg-cyan-500/90 text-black flex items-center justify-center shadow-[0_0_18px_rgba(6,182,212,0.8)]">
                            <Play fill="currentColor" size={20} className="ml-1" />
                          </div>
                        </div>

                        {/* Runtime Badge */}
                        {ep.runtime && ep.runtime > 0 && (
                          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-mono text-white/90 border border-white/20">
                            {ep.runtime}m
                          </span>
                        )}

                        {/* Progress Bar */}
                        {ep.playbackPercentage !== undefined && ep.playbackPercentage > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                            <div 
                              className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                              style={{ width: `${ep.playbackPercentage}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Episode Content */}
                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                            {epNumberFormatted}
                          </span>
                          <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                            {ep.title}
                          </h4>
                        </div>

                        <p className="text-white/60 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-2">
                          {ep.overview || 'No description available for this episode.'}
                        </p>

                        <div className="flex items-center gap-2 text-[10px] font-semibold text-white/50 uppercase tracking-wider">
                          {ep.resolutionBadge && (
                            <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-white/80">
                              {ep.resolutionBadge}
                            </span>
                          )}
                          {ep.hdrBadge && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {ep.hdrBadge}
                            </span>
                          )}
                          {ep.rating && (
                            <span className="flex items-center gap-1 text-amber-400">
                              <Star size={11} fill="currentColor" />
                              {ep.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
