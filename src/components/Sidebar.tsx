import { Home, Film, Disc3, RotateCcw, Heart, ChevronUp, Settings, Wifi, WifiOff } from 'lucide-react';

export type NavTab = 'home' | 'movies' | 'recent' | 'collections' | 'favorites';

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
    { id: 'recent', icon: RotateCcw, label: 'RECENT' },
    { id: 'collections', icon: Disc3, label: 'COLLECTIONS' },
    { id: 'favorites', icon: Heart, label: 'FAVORITES' },
  ];

  return (
    <div className="w-20 md:w-24 shrink-0 bg-black/60 backdrop-blur-xl border-r border-white/10 flex flex-col items-center py-6 z-20 h-full select-none">
      <div className="text-white/40 mb-4 flex flex-col items-center">
        <ChevronUp size={18} />
      </div>

      <div className="flex-1 flex flex-col gap-5 w-full items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-1.5 transition-all duration-300 group relative w-full ${
                isActive 
                  ? 'text-white' 
                  : 'text-white/45 hover:text-white'
              }`}
            >
              <div className={`p-3 rounded-2xl flex items-center justify-center transition-all ${
                isActive 
                  ? 'bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.2)] border border-white/40 scale-105' 
                  : 'group-hover:bg-white/10 group-hover:scale-105'
              }`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold tracking-widest uppercase transition-opacity ${
                isActive ? 'opacity-100 text-white' : 'opacity-60 group-hover:opacity-100'
              }`}>
                {item.label}
              </span>
              
              {/* Active Left Indicator Bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r-full shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer: Emby Connection Status & Settings */}
      <div className="mt-auto flex flex-col items-center gap-3 pt-4 border-t border-white/10 w-full px-2">
        <button
          onClick={onOpenSettings}
          title={isConnected ? `Emby Connected (${movieCount} movies)` : "Server Not Connected (Click to Setup)"}
          className="flex flex-col items-center gap-1 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all group relative w-full"
        >
          <div className="relative">
            <Settings size={20} />
            <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-black ${
              isConnected ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400 animate-pulse'
            }`} />
          </div>
          <span className="text-[9px] font-semibold text-zinc-400 group-hover:text-white uppercase tracking-wider">
            {isConnected ? `${movieCount}` : 'SETUP'}
          </span>
          
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-white text-[11px] font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none z-50 shadow-2xl">
            {isConnected ? `Emby Connected (${movieCount} movies)` : "Connect Emby Server"}
          </div>
        </button>
      </div>
    </div>
  );
}

