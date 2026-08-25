// frontend/src/hooks/useApiStatus.js
import { useState, useEffect, useRef } from 'react';
import { healthCheck } from '../services/api';

/**
 * Polls the backend health endpoint every `intervalMs` and returns the
 * real, current connection status — rather than a one-time check on
 * mount, which would go stale the moment the backend stops after the
 * page has already loaded.
 */
export function useApiStatus(intervalMs = 10000) {
  const [connected, setConnected] = useState(true); // optimistic initial state
  const [checked,   setChecked]   = useState(false); // becomes true after first real check
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        await healthCheck();
        if (!cancelled) { setConnected(true); setChecked(true); }
      } catch {
        if (!cancelled) { setConnected(false); setChecked(true); }
      }
    };

    check(); // immediate check on mount
    timerRef.current = setInterval(check, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
    };
  }, [intervalMs]);

  return { connected, checked };
}
