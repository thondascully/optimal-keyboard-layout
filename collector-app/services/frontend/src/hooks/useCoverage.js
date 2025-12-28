/**
 * Hook for fetching and managing finger pair coverage data.
 */

import { useState, useCallback, useEffect } from 'react';
import { coverageApi } from '../api/client';

export function useCoverage(autoFetch = true) {
  const [coverage, setCoverage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCoverage = useCallback(async (mode = 'trigraph_test') => {
    setLoading(true);
    setError(null);
    try {
      const data = await coverageApi.get(mode);
      setCoverage(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchCoverage();
    }
  }, [autoFetch, fetchCoverage]);

  return {
    coverage,
    loading,
    error,
    fetchCoverage,
    // Convenience accessors
    matrix: coverage?.matrix || [],
    gaps: coverage?.gaps || [],
    summary: coverage?.summary || {},
    fingers: coverage?.fingers || [],
  };
}

export default useCoverage;
