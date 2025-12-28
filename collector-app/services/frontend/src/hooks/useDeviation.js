/**
 * Hook for fetching finger deviation data.
 */

import { useState, useEffect, useCallback } from 'react';
import { deviationApi } from '../api/client';

export function useDeviation() {
  const [deviations, setDeviations] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDeviations = useCallback(async (limit = 100) => {
    setLoading(true);
    setError(null);

    try {
      const data = await deviationApi.get(limit);
      setDeviations(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch deviations');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPatterns = useCallback(async () => {
    try {
      const data = await deviationApi.getPatterns();
      setPatterns(data);
    } catch (err) {
      console.error('Failed to fetch deviation patterns:', err);
    }
  }, []);

  useEffect(() => {
    fetchDeviations();
    fetchPatterns();
  }, [fetchDeviations, fetchPatterns]);

  return {
    deviations,
    patterns,
    loading,
    error,
    fetchDeviations,
    fetchPatterns,
    summary: deviations?.summary || [],
    words: deviations?.words_with_deviations || [],
    totalDeviations: deviations?.total_deviations || 0,
    overwritableLetters: deviations?.overwritable_letters || [],
  };
}
