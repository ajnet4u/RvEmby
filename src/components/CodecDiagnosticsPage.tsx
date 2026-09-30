import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  RotateCw, 
  Copy, 
  Check, 
  Tv, 
  Volume2, 
  Video, 
  Disc, 
  Sparkles,
  Info,
  Server,
  ArrowLeft,
  Search,
  X
} from 'lucide-react';
import { detectDeviceCapabilities, DeviceMediaProfile, CodecInfo } from '../utils/codecDetector';

interface CodecDiagnosticsPageProps {
  onBackToHome?: () => void;
}

export function CodecDiagnosticsPage({ onBackToHome }: CodecDiagnosticsPageProps) {
  const [profile, setProfile] = useState<DeviceMediaProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'video' | 'audio' | 'container'>('all');
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const runScan = async () => {
    setLoading(true);
    try {
      const res = await detectDeviceCapabilities();
      setProfile(res);
    } catch (e) {
      console.error("Codec scan failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runScan();
  }, []);

  // Keyboard navigation: Escape or Backspace returns to home
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT') return;

      if ((e.key === 'Escape' || e.key === 'Backspace') && onBackToHome) {
        e.preventDefault();
        onBackToHome();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBackToHome]);

  const handleCopyReport = () => {
    if (!profile) return;
    const textReport = `JEmby Device Hardware Media Diagnostic
Platform: ${profile.platform}
Browser: ${profile.browser}
Resolution: ${profile.screenResolution}
HDR Display Supported: ${profile.isHdrSupported ? 'Yes' : 'No'}
Wide Color Gamut (P3): ${profile.isWideGamutSupported ? 'Yes' : 'No'}
Device Pixel Ratio: ${profile.devicePixelRatio}
Tested At: ${new Date(profile.testedAt).toLocaleString()}

--- CODEC CAPABILITIES ---
${profile.codecs.map(c => `[${c.supported ? 'YES' : 'NO'}] ${c.name} (${c.mimeType})${c.powerEfficient ? ' [HW ACCELERATED]' : ''}`).join('\n')}
`;
    navigator.clipboard.writeText(textReport).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const filteredCodecs = profile ? profile.codecs.filter(c => {
    const matchesCategory = activeTab === 'all' || c.category === activeTab;
    if (!matchesCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.mimeType.toLowerCase().includes(q) ||
      c.details.toLowerCase().includes(q)
    );
  }) : [];

  const videoSupportedCount = profile ? profile.codecs.filter(c => c.category === 'video' && c.supported).length : 0;
  const videoTotalCount = profile ? profile.codecs.filter(c => c.category === 'video').length : 0;

  const audioSupportedCount = profile ? profile.codecs.filter(c => c.category === 'audio' && c.supported).length : 0;
  const audioTotalCount = profile ? profile.codecs.filter(c => c.category === 'audio').length : 0;

  const hardwareDecodedCount = profile ? profile.codecs.filter(c => c.powerEfficient).length : 0;

  return (
    <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-6 md:p-10 select-none text-[#E0E0E0] font-sans bg-[#000000]">
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        
        {/* Page Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              {onBackToHome && (
                <button
                  onClick={onBackToHome}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-medium text-[#E0E0E0] hover:text-[#FFFFFF] transition-all cursor-pointer shadow-sm cinema-focus"
                  title="Return to Movies (Esc)"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              )}
              <div className="flex items-center gap-2 text-[#9E9E9E] text-xs font-semibold tracking-widest uppercase">
                <Cpu size={16} />
                <span>Hardware Diagnostics & Codec Inspector</span>
              </div>
            </div>
            <h1 className="cinema-title text-2xl md:text-3xl font-bold text-[#FFFFFF] tracking-wide">
              Device Media & Codec Capabilities
            </h1>
            <p className="text-xs md:text-sm text-[#9E9E9E]">
              Live hardware inspection of video/audio decoders and Emby Direct Play compatibility.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runScan}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-medium text-[#E0E0E0] hover:text-[#FFFFFF] transition-all disabled:opacity-50 cursor-pointer cinema-focus"
            >
              <RotateCw size={14} className={loading ? 'animate-spin text-white' : ''} />
              <span>{loading ? 'Testing...' : 'Re-scan Hardware'}</span>
            </button>

            <button
              onClick={handleCopyReport}
              disabled={!profile}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.12] hover:bg-white/[0.2] border border-white/[0.18] text-xs font-medium text-[#FFFFFF] transition-all cursor-pointer cinema-focus"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied Specs!' : 'Copy Hardware Report'}</span>
            </button>
          </div>
        </div>

        {/* Diagnostic Overview Metric Cards */}
        {profile && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Video Codecs */}
            <div className="p-5 rounded-2xl bg-black border border-white/[0.06] flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wider">Video Decoders</span>
                <Video size={18} className="text-[#9E9E9E]" />
              </div>
              <div className="text-2xl font-bold text-[#FFFFFF] tabular-nums">
                {videoSupportedCount} <span className="text-sm font-normal text-[#9E9E9E]">/ {videoTotalCount}</span>
              </div>
              <div className="text-[11px] text-[#9E9E9E] mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>H.264, VP9 {profile.codecs.some(c => c.id.includes('hevc') && c.supported) ? '+ HEVC' : ''}</span>
              </div>
            </div>

            {/* Metric 2: Audio Codecs */}
            <div className="p-5 rounded-2xl bg-black border border-white/[0.06] flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wider">Audio Decoders</span>
                <Volume2 size={18} className="text-[#9E9E9E]" />
              </div>
              <div className="text-2xl font-bold text-[#FFFFFF] tabular-nums">
                {audioSupportedCount} <span className="text-sm font-normal text-[#9E9E9E]">/ {audioTotalCount}</span>
              </div>
              <div className="text-[11px] text-[#9E9E9E] mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>AAC, Opus, FLAC, MP3, PCM</span>
              </div>
            </div>

            {/* Metric 3: Display & HDR */}
            <div className="p-5 rounded-2xl bg-black border border-white/[0.06] flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wider">Display & HDR</span>
                <Tv size={18} className="text-[#9E9E9E]" />
              </div>
              <div className="text-lg font-semibold text-[#FFFFFF] truncate">
                {profile.isHdrSupported ? 'HDR10 / High Dynamic' : 'Standard Dynamic (SDR)'}
              </div>
              <div className="text-[11px] text-[#9E9E9E] mt-2 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${profile.isHdrSupported ? 'bg-white' : 'bg-[#9E9E9E]'}`} />
                <span>{profile.screenResolution.split('(')[0]} · {profile.colorDepth}-bit</span>
              </div>
            </div>

            {/* Metric 4: Hardware Acceleration */}
            <div className="p-5 rounded-2xl bg-black border border-white/[0.06] flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wider">Hardware Decoding</span>
                <Zap size={18} className="text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-[#FFFFFF] tabular-nums">
                {hardwareDecodedCount} <span className="text-sm font-normal text-[#9E9E9E]">Codecs HW</span>
              </div>
              <div className="text-[11px] text-[#9E9E9E] mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Zero-load GPU playback</span>
              </div>
            </div>
          </div>
        )}

        {/* Emby Direct Play Notice */}
        <div className="p-4 rounded-xl bg-black border border-white/[0.06] flex items-start gap-3 text-xs text-[#9E9E9E]">
          <Server size={18} className="text-[#9E9E9E] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-[#E0E0E0]">How JEmby handles codec compatibility:</span>
            <p>
              Formats marked <strong className="text-emerald-400">Direct Play</strong> stream natively from your Emby / Jellyfin server without transcoding, consuming virtually 0% server CPU power. Formats marked <strong className="text-[#9E9E9E]">Emby Transcode</strong> are automatically re-encoded in real time by your Emby server into compatible H.264/AAC streams.
            </p>
          </div>
        </div>

        {/* Codec Filter Tabs & Quick Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 cinema-focus ${
                activeTab === 'all' 
                  ? 'bg-white/[0.18] text-[#FFFFFF] border border-white/[0.25] shadow-[0_0_12px_rgba(255,255,255,0.15)]' 
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#9E9E9E] hover:text-[#FFFFFF]'
              }`}
            >
              All Formats ({profile?.codecs.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('video')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 cinema-focus ${
                activeTab === 'video' 
                  ? 'bg-white/[0.18] text-[#FFFFFF] border border-white/[0.25] shadow-[0_0_12px_rgba(255,255,255,0.15)]' 
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#9E9E9E] hover:text-[#FFFFFF]'
              }`}
            >
              Video Codecs ({videoTotalCount})
            </button>

            <button
              onClick={() => setActiveTab('audio')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 cinema-focus ${
                activeTab === 'audio' 
                  ? 'bg-white/[0.18] text-[#FFFFFF] border border-white/[0.25] shadow-[0_0_12px_rgba(255,255,255,0.15)]' 
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#9E9E9E] hover:text-[#FFFFFF]'
              }`}
            >
              Audio Codecs ({audioTotalCount})
            </button>

            <button
              onClick={() => setActiveTab('container')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 cinema-focus ${
                activeTab === 'container' 
                  ? 'bg-white/[0.18] text-[#FFFFFF] border border-white/[0.25] shadow-[0_0_12px_rgba(255,255,255,0.15)]' 
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#9E9E9E] hover:text-[#FFFFFF]'
              }`}
            >
              Containers & Streams ({profile?.codecs.filter(c => c.category === 'container').length || 0})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search codecs (e.g. hevc, ac3, hdr)..."
              className="w-full sm:w-64 pl-8 pr-7 py-1.5 rounded-lg bg-black border border-white/[0.1] focus:border-white/30 text-[#FFFFFF] placeholder-[#9E9E9E]/50 text-xs focus:outline-none transition-all cinema-focus"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9E9E9E] hover:text-[#FFFFFF] p-0.5 rounded-full"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Codec Details List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredCodecs.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-[#9E9E9E] text-sm">
              No matching codecs found for "{searchQuery}".
            </div>
          ) : (
            filteredCodecs.map((codec) => (
              <div
                key={codec.id}
                tabIndex={0}
                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 outline-none cinema-focus ${
                  codec.supported 
                    ? 'bg-black border-white/[0.06] hover:border-white/[0.15]' 
                    : 'bg-black border-white/[0.02] opacity-50'
                }`}
              >
                <div className="space-y-1.5 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {codec.name}
                    </span>
                    {codec.powerEfficient && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-1.5 py-0.5 rounded">
                        <Zap size={11} className="fill-amber-400" />
                        HW ACCEL
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {codec.details}
                  </p>

                  <div className="pt-1 font-mono text-[10px] text-zinc-500 select-all">
                    {codec.mimeType}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {codec.supported ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span>Direct Play</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700/60 text-zinc-400 text-xs font-medium">
                      <XCircle size={13} className="text-zinc-500" />
                      <span>Emby Transcode</span>
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Client System Details Footer */}
        {profile && (
          <div className="rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-5 space-y-2 text-xs text-zinc-400 font-mono">
            <div className="text-zinc-200 font-bold text-xs uppercase tracking-wider mb-2 font-sans flex items-center gap-2">
              <Info size={14} className="text-cyan-400" />
              <span>Host Device & Client Fingerprint</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div><strong>Platform OS:</strong> {profile.platform}</div>
              <div><strong>Browser Engine:</strong> {profile.browser}</div>
              <div><strong>Screen Dimensions:</strong> {profile.screenResolution}</div>
              <div><strong>Device Pixel Ratio:</strong> {profile.devicePixelRatio}x</div>
              <div><strong>Color Depth:</strong> {profile.colorDepth}-bit</div>
              <div><strong>P3 Wide Gamut:</strong> {profile.isWideGamutSupported ? 'Supported' : 'Standard sRGB'}</div>
            </div>
            <div className="pt-2 text-[10px] text-zinc-600 truncate">
              UA: {profile.userAgent}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
