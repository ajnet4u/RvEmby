/**
 * Living Room / Smart TV / Remote Control & Gamepad Spatial Navigation Engine
 * Provides fluid 2D D-Pad navigation (Up, Down, Left, Right, OK, Back) for JEmby.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

interface Point {
  x: number;
  y: number;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  center: Point;
}

function getRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return {
    left: r.left,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
    center: {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2
    }
  };
}

/**
 * Checks if an element is truly visible and interactable in the viewport.
 */
function isVisible(el: HTMLElement): boolean {
  if (!el || el.offsetParent === null && el.tagName !== 'BODY') return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
    return false;
  }
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  // Within viewport bounds or near viewport
  return (
    r.bottom >= -100 &&
    r.top <= window.innerHeight + 100 &&
    r.right >= -100 &&
    r.left <= window.innerWidth + 100
  );
}

/**
 * Queries all focusable candidate elements inside a given root scope.
 */
export function getFocusableElements(scope: HTMLElement = document.body): HTMLElement[] {
  const selector = [
    'button:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    '[data-tv-focus="true"]'
  ].join(', ');

  const elements = Array.from(scope.querySelectorAll<HTMLElement>(selector));
  return elements.filter(el => isVisible(el));
}

/**
 * Calculates a directional score between the current element and a candidate.
 * Lower score = better candidate.
 */
function calculateDistanceScore(curr: Rect, cand: Rect, dir: Direction): number {
  let primaryDiff = 0;
  let secondaryDiff = 0;

  switch (dir) {
    case 'right':
      primaryDiff = cand.left - curr.center.x;
      secondaryDiff = Math.abs(cand.center.y - curr.center.y);
      if (cand.center.x <= curr.center.x + 4) return Infinity; // Must be to the right
      break;
    case 'left':
      primaryDiff = curr.center.x - cand.right;
      secondaryDiff = Math.abs(cand.center.y - curr.center.y);
      if (cand.center.x >= curr.center.x - 4) return Infinity; // Must be to the left
      break;
    case 'down':
      primaryDiff = cand.top - curr.center.y;
      secondaryDiff = Math.abs(cand.center.x - curr.center.x);
      if (cand.center.y <= curr.center.y + 4) return Infinity; // Must be downwards
      break;
    case 'up':
      primaryDiff = curr.center.y - cand.bottom;
      secondaryDiff = Math.abs(cand.center.x - curr.center.x);
      if (cand.center.y >= curr.center.y - 4) return Infinity; // Must be upwards
      break;
  }

  if (primaryDiff < 0) primaryDiff = 0;

  // Overlap bonus: give priority to candidates that share alignment on the secondary axis
  let overlap = 0;
  if (dir === 'left' || dir === 'right') {
    const overlapTop = Math.max(curr.top, cand.top);
    const overlapBottom = Math.min(curr.bottom, cand.bottom);
    if (overlapBottom > overlapTop) {
      overlap = overlapBottom - overlapTop;
    }
  } else {
    const overlapLeft = Math.max(curr.left, cand.left);
    const overlapRight = Math.min(curr.right, cand.right);
    if (overlapRight > overlapLeft) {
      overlap = overlapRight - overlapLeft;
    }
  }

  // Weight primary distance higher, penalize off-axis distance, reward overlapping elements
  return primaryDiff * 1.5 + secondaryDiff * 2.2 - overlap * 1.0;
}

/**
 * Finds the best element to focus next in the specified direction.
 */
export function findNextElement(currentEl: HTMLElement, dir: Direction, container?: HTMLElement): HTMLElement | null {
  const root = container || document.body;
  const candidates = getFocusableElements(root).filter(el => el !== currentEl);

  if (candidates.length === 0) return null;

  const currRect = getRect(currentEl);
  let bestScore = Infinity;
  let bestElement: HTMLElement | null = null;

  for (const cand of candidates) {
    const candRect = getRect(cand);
    const score = calculateDistanceScore(currRect, candRect, dir);
    if (score < bestScore) {
      bestScore = score;
      bestElement = cand;
    }
  }

  return bestElement;
}

/**
 * Focuses an element smoothly and centers it in the TV viewport without shifting horizontal window scroll.
 */
export function focusTvElement(el: HTMLElement) {
  try {
    el.focus({ preventScroll: true });
    if (el.scrollIntoView) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  } catch {
    el.focus();
  }
}
