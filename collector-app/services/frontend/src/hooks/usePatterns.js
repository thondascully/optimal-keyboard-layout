/**
 * Hook for fetching and managing pattern analysis data.
 */

import { useState, useCallback } from 'react';
import { patternsApi } from '../api/client';

export function usePatterns() {
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPatterns = useCallback(async (mode = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await patternsApi.analyze(mode);
      setPatterns(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDigraphDetails = useCallback(async (pattern) => {
    try {
      return await patternsApi.getDigraph(pattern);
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  return {
    patterns,
    loading,
    error,
    fetchPatterns,
    getDigraphDetails,
  };
}

export default usePatterns;
