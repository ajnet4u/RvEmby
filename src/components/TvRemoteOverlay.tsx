import React from 'react';
import { Tv, Gamepad2, ArrowLeft, Check, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TvRemoteOverlayProps {
  visible: boolean;
  isPlaying?: boolean;
}

export function TvRemoteOverlay({ visible, isPlaying = false }: TvRemoteOverlayProps) {
  if (isPlaying) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-4 right-4 z-30 pointer-events-none hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3)] text-xs text-white/90 select-none font-sans"
        >
          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold uppercase tracking-wider text-[10px]">
            <Tv size={14} className="animate-pulse" />
            <span>TV Remote Mode</span>
          </div>

          <div className="h-3 w-px bg-white/20" />

          {/* D-Pad Hint */}
          <div className="flex items-center gap-1 text-[11px] text-white/80">
            <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[10px] text-cyan-300">
              ◀ ▲ ▼ ▶
            </span>
            <span>Navigate</span>
          </div>

          <div className="h-3 w-px bg-white/20" />

          {/* OK / Select Hint */}
          <div className="flex items-center gap-1 text-[11px] text-white/80">
            <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[10px] text-white font-bold">
              OK / Enter
            </span>
            <span>Select</span>
          </div>

          <div className="h-3 w-px bg-white/20" />

          {/* Back Hint */}
          <div className="flex items-center gap-1 text-[11px] text-white/80">
            <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[10px] text-white">
              Back
            </span>
            <span>Return</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
