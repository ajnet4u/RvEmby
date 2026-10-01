import React from 'react';
import { Tv, Gamepad2, ArrowLeft, Check, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TvRemoteOverlayProps {
  visible: boolean;
  isPlaying?: boolean;
  isRootHome?: boolean;
}

export function TvRemoteOverlay({ visible, isPlaying = false, isRootHome = false }: TvRemoteOverlayProps) {
  if (isPlaying) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-4 right-4 z-30 pointer-events-none hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-black/90 backdrop-blur-md border border-white/[0.1] shadow-[0_0_24px_rgba(255,255,255,0.08)] text-xs text-[#E0E0E0] select-none font-sans"
        >
          <div className="flex items-center gap-1.5 text-[#FFFFFF] font-semibold uppercase tracking-wider text-[10px]">
            <Tv size={14} className="opacity-80" />
            <span>TV Remote Mode</span>
          </div>

          <div className="h-3 w-px bg-white/10" />

          {/* D-Pad Hint */}
          <div className="flex items-center gap-1 text-[11px] text-[#E0E0E0]">
            <span className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/15 font-mono text-[10px] text-[#FFFFFF]">
              ◀ ▲ ▼ ▶
            </span>
            <span>Navigate</span>
          </div>

          <div className="h-3 w-px bg-white/10" />

          {/* OK / Select Hint */}
          <div className="flex items-center gap-1 text-[11px] text-[#E0E0E0]">
            <span className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/15 font-mono text-[10px] text-[#FFFFFF] font-bold">
              OK / Enter
            </span>
            <span>Select</span>
          </div>

          <div className="h-3 w-px bg-white/10" />

          {/* Back Hint */}
          <div className="flex items-center gap-1 text-[11px] text-[#E0E0E0]">
            <span className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/15 font-mono text-[10px] text-[#FFFFFF]">
              Back / Esc
            </span>
            <span>{isRootHome ? 'Exit' : 'Return'}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
