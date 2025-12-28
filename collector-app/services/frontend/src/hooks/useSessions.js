/**
 * Hook for fetching and managing sessions list.
 */

import { useState, useEffect, useCallback } from 'react';
import { sessionApi } from '../api/client';

export function useSessions(limit = 1000) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sessionApi.list(limit);
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const deleteSession = useCallback(async (sessionId) => {
    try {
      await sessionApi.delete(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const updateLabel = useCallback(async (sessionId, label) => {
    try {
      await sessionApi.updateLabel(sessionId, label);
      setSessions(prev =>
        prev.map(s => (s.id === sessionId ? { ...s, label } : s))
      );
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  return {
    sessions,
    loading,
    error,
    refetch: fetchSessions,
    deleteSession,
    updateLabel,
  };
}

export default useSessions;
