import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async call and tracks { data, loading, error }.
 * `execute` is stable and never throws, so a failed request can't crash the UI.
 */
export function useApi(call, { immediate = true, deps = [] } = {}) {
  const callRef = useRef(call);
  const mounted = useRef(true);
  const [state, setState] = useState({ data: null, loading: immediate, error: null });

  useEffect(() => {
    callRef.current = call;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const execute = useCallback(async (...args) => {
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const data = await callRef.current(...args);
      if (mounted.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (mounted.current) setState((previous) => ({ ...previous, loading: false, error }));
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (immediate) execute();
  }, [execute, immediate, ...deps]);

  return { ...state, execute };
}
