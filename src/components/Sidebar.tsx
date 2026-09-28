import { Home, Film, Disc3, PlaySquare, RotateCcw, Users, Heart, Headphones, ChevronUp, Settings } from 'lucide-react';

interface SidebarProps {
  onOpenSettings: () => void;
}

export function Sidebar({ onOpenSettings }: SidebarProps) {
  const navItems = [
    { icon: Home, label: 'ACCUEIL', active: true },
    { icon: PlaySquare, label: 'VIDEOS' },
    { icon: Film, label: 'MOVIES' },
    { icon: Disc3, label: 'COLLECTIONS' },
    { icon: RotateCcw, label: 'RECENT' },
    { icon: Users, label: 'ACTORS' },
    { icon: Heart, label: 'FAVORITES' },
    { icon: Headphones, label: 'MUSIC' },
  ];

  return (
    <div className="w-20 md:w-24 shrink-0 bg-black/50 backdrop-blur-xl border-r border-white/10 flex flex-col items-center py-6 z-20 h-full">
      <button className="text-white/50 hover:text-white mb-6">
         <ChevronUp size={20} />
      </button>

      <div className="flex-1 flex flex-col gap-6 w-full items-center">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              className={`flex flex-col items-center gap-1 transition-all duration-300 group relative w-full ${
                item.active 
                  ? 'text-white' 
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <div className={`p-2.5 rounded-2xl flex items-center justify-center ${item.active ? 'bg-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/30' : 'group-hover:bg-white/10'}`}>
                 <Icon size={22} strokeWidth={item.active ? 2.5 : 2} />
              </div>
              {item.active && (
                <span className="text-[10px] font-bold tracking-widest">{item.label}</span>
              )}
              
              {/* Tooltip for non-active items */}
              {!item.active && (
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-zinc-800 text-white text-[10px] tracking-widest font-bold rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none z-50 uppercase border border-white/10 shadow-xl">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onOpenSettings}
        className="mt-auto p-2.5 rounded-2xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all duration-300 group relative"
      >
        <Settings size={22} />
        <div className="absolute left-full ml-4 px-3 py-1.5 bg-zinc-800 text-white text-[10px] tracking-widest font-bold rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none z-50 uppercase border border-white/10 shadow-xl">
          SETTINGS
        </div>
      </button>
    </div>
  );
}
