/**
 * Hook for fetching and managing a single session.
 */

import { useState, useCallback, useEffect } from 'react';
import { sessionApi } from '../api/client';

export function useSession(initialSessionId = null) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(!!initialSessionId);
  const [error, setError] = useState(null);

  const fetchSession = useCallback(async (sessionId) => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await sessionApi.get(sessionId);
      setSession(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch when initialSessionId is provided
  useEffect(() => {
    if (initialSessionId) {
      fetchSession(initialSessionId);
    }
  }, [initialSessionId, fetchSession]);

  const updateLabel = useCallback(async (sessionId, label) => {
    try {
      await sessionApi.updateLabel(sessionId, label);
      if (session && session.id === sessionId) {
        setSession({ ...session, label });
      }
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [session]);

  const updateFingers = useCallback(async (sessionId, annotations) => {
    try {
      const result = await sessionApi.updateFingers(sessionId, annotations);
      // Refetch to get updated data
      await fetchSession(sessionId);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [fetchSession]);

  const deleteSession = useCallback(async (sessionId) => {
    try {
      await sessionApi.delete(sessionId);
      if (session && session.id === sessionId) {
        setSession(null);
      }
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [session]);

  return {
    session,
    loading,
    error,
    fetchSession,
    updateLabel,
    updateFingers,
    deleteSession,
    setSession,
  };
}

export default useSession;
