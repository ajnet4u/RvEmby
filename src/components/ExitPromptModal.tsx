import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, X, AlertTriangle } from 'lucide-react';

interface ExitPromptModalProps {
  isOpen: boolean;
  onCancel: () => void;
}

export function ExitPromptModal({ isOpen, onCancel }: ExitPromptModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const [browserCloseBlocked, setBrowserCloseBlocked] = useState(false);

  // Auto-focus "Cancel" button whenever modal opens (as requested: Cancel is default focus)
  useEffect(() => {
    if (isOpen) {
      setBrowserCloseBlocked(false);
      // Small timeout to allow DOM mounting
      const timer = setTimeout(() => {
        if (cancelButtonRef.current) {
          cancelButtonRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard navigation inside exit dialog (Esc/Back cancels, Enter triggers active)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' || 
        e.key === 'Backspace' || 
        e.keyCode === 10009 || // Tizen Return
        e.keyCode === 461 ||   // webOS Back
        e.keyCode === 4        // Android TV Back
      ) {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  /**
   * Platform-Aware Exit Logic:
   * 1. Android / Capacitor / Cordova: navigator.app.exitApp()
   * 2. Samsung Tizen: tizen.application.getCurrentApplication().exit()
   * 3. LG webOS: window.webOS.platformBack()
   * 4. Electron / PC Wrapper: window.electron.exitApp() or window.api.quit()
   * 5. Web Browser: window.close() with fallback notice
   */
  const handleConfirmExit = () => {
    try {
      // 1. Android TV / Cordova / Capacitor
      const nav = navigator as any;
      if (nav.app && typeof nav.app.exitApp === 'function') {
        nav.app.exitApp();
        return;
      }
      if (nav.device && typeof nav.device.exitApp === 'function') {
        nav.device.exitApp();
        return;
      }

      // 2. Samsung Tizen Smart TV
      const win = window as any;
      if (win.tizen && win.tizen.application) {
        try {
          const app = win.tizen.application.getCurrentApplication();
          if (app && typeof app.exit === 'function') {
            app.exit();
            return;
          }
        } catch (e) {
          console.warn("Tizen exit error:", e);
        }
      }

      // 3. LG webOS Smart TV
      if (win.webOS && typeof win.webOS.platformBack === 'function') {
        win.webOS.platformBack();
        return;
      }

      // 4. Electron / Desktop PC Wrapper
      if (win.electron && typeof win.electron.exitApp === 'function') {
        win.electron.exitApp();
        return;
      }
      if (win.api && typeof win.api.quit === 'function') {
        win.api.quit();
        return;
      }

      // 5. Standard Web Browser
      window.close();

      // Check if browser blocked window.close() (standard browsers block scripts from closing tabs they didn't window.open)
      setTimeout(() => {
        // If script execution is still alive here, the tab wasn't closed
        setBrowserCloseBlocked(true);
      }, 300);
    } catch (err) {
      console.warn("Exit command failed:", err);
      setBrowserCloseBlocked(true);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          data-tv-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 select-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 15 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="w-full max-w-md bg-[#121212] border border-white/15 rounded-3xl p-6 md:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.95)] relative text-center flex flex-col items-center"
          >
            {/* Ambient Top Glow */}
            <div className="absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            {/* Icon Header */}
            <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(255,255,255,0.06)]">
              <LogOut size={26} className="text-white ml-0.5" />
            </div>

            {/* Prompt Text */}
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-2">
              Exit Application
            </h2>
            <p className="text-sm text-[#9E9E9E] max-w-xs mb-6 leading-relaxed">
              Are you sure you want to exit?
            </p>

            {/* Browser Policy Fallback Warning */}
            {browserCloseBlocked && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2.5 text-left"
              >
                <AlertTriangle size={18} className="shrink-0 text-amber-400" />
                <span>
                  Your browser prevented closing this tab automatically. You may safely close this browser window or tab manually.
                </span>
              </motion.div>
            )}

            {/* Dual Action Buttons (Cancel default focused) */}
            <div className="grid grid-cols-2 gap-3.5 w-full">
              {/* Cancel Button (Default Focus) */}
              <button
                ref={cancelButtonRef}
                tabIndex={0}
                data-tv-focus="true"
                onClick={onCancel}
                className="w-full py-3.5 px-5 rounded-2xl bg-white text-black font-semibold text-sm shadow-[0_0_20px_rgba(255,255,255,0.25)] hover:bg-neutral-200 transition-all cursor-pointer cinema-focus focus:outline-none focus:ring-4 focus:ring-white/50 active:scale-95"
              >
                Cancel
              </button>

              {/* Exit Button */}
              <button
                tabIndex={0}
                data-tv-focus="true"
                onClick={handleConfirmExit}
                className="w-full py-3.5 px-5 rounded-2xl bg-white/[0.08] hover:bg-red-500/20 text-[#E0E0E0] hover:text-red-300 font-semibold text-sm border border-white/10 hover:border-red-500/40 transition-all cursor-pointer cinema-focus focus:outline-none focus:ring-4 focus:ring-red-500/50 active:scale-95"
              >
                Exit
              </button>
            </div>

            {/* Remote Navigation Hint */}
            <div className="mt-5 text-[11px] font-mono text-zinc-500 flex items-center gap-3">
              <span>← / → Switch</span>
              <span>•</span>
              <span>Enter Select</span>
              <span>•</span>
              <span>Back / Esc Cancel</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
