import { useRouter, type Href } from 'expo-router';
import { useRef } from 'react';

const TAP_GUARD_MS = 500;

// Drop-in replacement for useRouter() that swallows push/replace calls fired
// within TAP_GUARD_MS of the previous one. Prevents the same screen from being
// pushed twice when a card or button is tapped rapidly. back/canGoBack pass
// through unchanged.
export function useNavigationGuard() {
  const router = useRouter();
  const lastNavAt = useRef(0);

  const guard = (fn: () => void) => {
    const now = Date.now();
    if (now - lastNavAt.current < TAP_GUARD_MS) return;
    lastNavAt.current = now;
    fn();
  };

  return {
    push: (href: Href) => guard(() => router.push(href)),
    replace: (href: Href) => guard(() => router.replace(href)),
    back: () => router.back(),
    canGoBack: () => router.canGoBack(),
  };
}
