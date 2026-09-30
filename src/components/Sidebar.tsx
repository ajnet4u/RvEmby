import { Home, Film, Disc3, RotateCcw, Heart, ChevronUp, Settings, Wifi, WifiOff, Cpu, Tv } from 'lucide-react';

export type NavTab = 'home' | 'movies' | 'tv' | 'recent' | 'collections' | 'favorites' | 'codecs';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSettings: () => void;
  isConnected: boolean;
  movieCount: number;
}

export function Sidebar({ activeTab, onSelectTab, onOpenSettings, isConnected, movieCount }: SidebarProps) {
  const navItems: { id: NavTab; icon: any; label: string }[] = [
    { id: 'home', icon: Home, label: 'ACCUEIL' },
    { id: 'movies', icon: Film, label: 'MOVIES' },
    { id: 'tv', icon: Tv, label: 'SERIES' },
    { id: 'recent', icon: RotateCcw, label: 'RECENT' },
    { id: 'collections', icon: Disc3, label: 'COLLECTIONS' },
    { id: 'favorites', icon: Heart, label: 'FAVORITES' },
    { id: 'codecs', icon: Cpu, label: 'CODECS' },
  ];

  return (
    <div className="w-20 md:w-24 shrink-0 bg-[#000000]/80 backdrop-blur-xl border-r border-white/[0.04] flex flex-col items-center py-5 z-20 h-full select-none">
      {/* JEmby Brand Header */}
      <div className="mb-5 flex flex-col items-center group cursor-default">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.08] flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.06)] transition-transform duration-300 group-hover:scale-105">
          <span className="text-[#FFFFFF] font-black text-xl tracking-tighter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">J</span>
        </div>
        <span className="text-[11px] font-black tracking-widest text-[#E0E0E0] mt-1 uppercase">JEmby</span>
      </div>

      <div className="flex-1 flex flex-col gap-5 w-full items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              data-tv-focus="true"
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-1.5 transition-all duration-300 group relative w-full focus:outline-none cinema-focus ${
                isActive 
                  ? 'text-[#FFFFFF]' 
                  : 'text-[#9E9E9E] hover:text-[#FFFFFF] focus:text-[#FFFFFF]'
              }`}
            >
              <div className={`p-3 rounded-2xl flex items-center justify-center transition-all ${
                isActive 
                  ? 'bg-white/[0.12] shadow-[0_0_24px_rgba(255,255,255,0.18)] border border-white/[0.15] scale-105' 
                  : 'group-hover:bg-white/[0.06] group-hover:scale-105 group-focus:bg-white/[0.12] group-focus:scale-105'
              }`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-semibold tracking-widest uppercase transition-opacity ${
                isActive ? 'opacity-100 text-[#FFFFFF]' : 'opacity-65 group-hover:opacity-100 group-focus:opacity-100'
              }`}>
                {item.label}
              </span>
              
              {/* Active Left Indicator Bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-7 bg-[#FFFFFF] rounded-r-full shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer: Emby Connection Status & Settings */}
      <div className="mt-auto flex flex-col items-center gap-3 pt-4 border-t border-white/[0.04] w-full px-2">
        <button
          onClick={onOpenSettings}
          title={isConnected ? `Emby Connected (${movieCount} movies)` : "Server Not Connected (Click to Setup)"}
          className="flex flex-col items-center gap-1 p-2 rounded-xl text-[#9E9E9E] hover:text-[#FFFFFF] hover:bg-white/[0.06] transition-all group relative w-full cinema-focus"
        >
          <div className="relative">
            <Settings size={20} />
            <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-black ${
              isConnected ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400 animate-pulse'
            }`} />
          </div>
          <span className="text-[9px] font-semibold text-[#9E9E9E] group-hover:text-[#FFFFFF] uppercase tracking-wider">
            {isConnected ? `${movieCount}` : 'SETUP'}
          </span>
          
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#000000] border border-white/[0.1] text-[#E0E0E0] text-[11px] font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none z-50 shadow-2xl backdrop-blur-md">
            {isConnected ? `Emby Connected (${movieCount} movies)` : "Connect Emby Server"}
          </div>
        </button>
      </div>
    </div>
  );
}

