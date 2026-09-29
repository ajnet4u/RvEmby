import { useState, useEffect, useRef, useCallback } from 'react';
import { Direction, findNextElement, focusTvElement, getFocusableElements } from '../utils/spatialNavigation';

interface UseTvNavigationOptions {
  onBack?: () => boolean; // return true if handled
  enabled?: boolean;
}

export function useTvNavigation({ onBack, enabled = true }: UseTvNavigationOptions = {}) {
  const [isTvMode, setIsTvMode] = useState(false);
  const lastGamepadAction = useRef<number>(0);
  const animFrameId = useRef<number | null>(null);

  // Activates TV / Remote mode when remote/keyboard/gamepad is touched
  const activateTvMode = useCallback(() => {
    setIsTvMode(true);
  }, []);

  // Spatial arrow navigation handler
  const handleDirection = useCallback((dir: Direction) => {
    activateTvMode();

    // Check if an active modal or overlay is open
    const modalScope = document.querySelector<HTMLElement>(
      '[role="dialog"], [data-tv-modal="true"], .fixed.z-40, .fixed.z-50'
    );
    const scope = modalScope || document.body;

    const current = document.activeElement as HTMLElement | null;

    // If an input is currently active and user presses left/right, let them edit text
    if (current && current.tagName === 'INPUT') {
      if (dir === 'left' || dir === 'right') {
        return;
      }
    }

    if (!current || !scope.contains(current) || current === document.body) {
      // Find first visible focusable element in scope
      const candidates = getFocusableElements(scope);
      if (candidates.length > 0) {
        focusTvElement(candidates[0]);
      }
      return;
    }

    const next = findNextElement(current, dir, scope);
    if (next) {
      focusTvElement(next);
    }
  }, [activateTvMode]);

  // Keyboard and TV remote keydown listener
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Arrow navigation
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleDirection('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleDirection('down');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleDirection('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleDirection('right');
      } else if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'BrowserBack') {
        if (onBack) {
          const handled = onBack();
          if (handled) {
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleDirection, onBack]);

  // Gamepad polling loop for Gamepads & Android TV controllers
  useEffect(() => {
    if (!enabled) return;

    let isPolling = true;

    const pollGamepads = () => {
      if (!isPolling) return;

      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads && gamepads.length > 0 ? gamepads[0] : null;

      if (gp) {
        const now = Date.now();
        const cooldown = 220; // 220ms repeat rate for smooth living room scrolling

        if (now - lastGamepadAction.current > cooldown) {
          // D-Pad buttons
          const up = gp.buttons[12]?.pressed || gp.axes[1] < -0.5;
          const down = gp.buttons[13]?.pressed || gp.axes[1] > 0.5;
          const left = gp.buttons[14]?.pressed || gp.axes[0] < -0.5;
          const right = gp.buttons[15]?.pressed || gp.axes[0] > 0.5;

          const btnA = gp.buttons[0]?.pressed; // Select / OK
          const btnB = gp.buttons[1]?.pressed; // Back

          if (up) {
            handleDirection('up');
            lastGamepadAction.current = now;
          } else if (down) {
            handleDirection('down');
            lastGamepadAction.current = now;
          } else if (left) {
            handleDirection('left');
            lastGamepadAction.current = now;
          } else if (right) {
            handleDirection('right');
            lastGamepadAction.current = now;
          } else if (btnA) {
            const active = document.activeElement as HTMLElement | null;
            if (active && typeof active.click === 'function') {
              active.click();
            }
            lastGamepadAction.current = now + 150;
          } else if (btnB) {
            if (onBack) onBack();
            lastGamepadAction.current = now + 150;
          }
        }
      }

      animFrameId.current = requestAnimationFrame(pollGamepads);
    };

    animFrameId.current = requestAnimationFrame(pollGamepads);

    return () => {
      isPolling = false;
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [enabled, handleDirection, onBack]);

  // Subtle mouse detection to dismiss TV badge if user uses a mouse
  useEffect(() => {
    let moveCount = 0;
    const handleMouseMove = () => {
      moveCount++;
      if (moveCount > 5) {
        setIsTvMode(false);
        moveCount = 0;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return {
    isTvMode,
    activateTvMode,
    navigateDirection: handleDirection
  };
}
