/**
 * Patterns Tab - Compact pattern explorer with clickable items.
 */

import { useState, useEffect, useMemo } from 'react';
import { patternsApi } from '../../api/client';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine } from 'recharts';
import { classifyDigraph } from '../../utils/fingerMapping';
import './PatternsTab.css';

function PatternsTab() {
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('digraphs');
  const [sortBy, setSortBy] = useState('avg_time');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [patternDetails, setPatternDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState(null);

  useEffect(() => {
    loadPatterns();
  }, [modeFilter]);

  const loadPatterns = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await patternsApi.getDetailed(modeFilter);
      setPatterns(data);
    } catch (err) {
      setError(err.message || 'Failed to load patterns');
    } finally {
      setLoading(false);
    }
  };

  const currentPatterns = useMemo(() => {
    if (!patterns) return [];
    const list = viewMode === 'digraphs' ? patterns.digraphs : patterns.trigraphs;
    if (!list) return [];

    let filtered = list;
    if (searchTerm) {
      filtered = list.filter(p => p.pattern.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'avg_time') cmp = a.avg_time - b.avg_time;
      else if (sortBy === 'count') cmp = a.count - b.count;
      else if (sortBy === 'pattern') cmp = a.pattern.localeCompare(b.pattern);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [patterns, viewMode, searchTerm, sortBy, sortOrder]);

  const handlePatternClick = async (pattern) => {
    if (selectedPattern?.pattern === pattern.pattern) {
      setSelectedPattern(null);
      setPatternDetails(null);
      return;
    }

    setSelectedPattern(pattern);
    setLoadingDetails(true);

    try {
      // Use digraph or trigraph endpoint based on pattern length
      const endpoint = pattern.pattern.length === 2 ? 'digraph' : 'trigraph';
      const response = await fetch(`/api/${endpoint}/${encodeURIComponent(pattern.pattern)}`);
      if (response.ok) {
        const details = await response.json();
        setPatternDetails(details);
      } else {
        setPatternDetails(null);
      }
    } catch (err) {
      console.error('Failed to load pattern details:', err);
      setPatternDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getSpeedIndicator = (avgTime, allPatterns) => {
    if (!allPatterns.length) return 'neutral';
    const sorted = [...allPatterns].sort((a, b) => a.avg_time - b.avg_time);
    const idx = sorted.findIndex(p => p.pattern === avgTime.pattern);
    const percentile = idx / sorted.length;
    if (percentile < 0.25) return 'fast';
    if (percentile < 0.5) return 'medium';
    if (percentile < 0.75) return 'slow';
    return 'slowest';
  };

  // Build distribution chart data with outlier highlighting
  const distributionData = useMemo(() => {
    if (!patternDetails?.raw_times || patternDetails.raw_times.length === 0) return null;

    const times = patternDetails.raw_times;
    const mean = patternDetails.avg_time || times.reduce((a, b) => a + b, 0) / times.length;
    const thresholdLow = patternDetails.threshold_low;
    const thresholdHigh = patternDetails.threshold_high;

    // Create histogram bins
    const min = Math.min(...times);
    const max = Math.max(...times);
    const binCount = Math.min(15, Math.ceil(Math.sqrt(times.length)));
    const binWidth = (max - min) / binCount || 1;

    const bins = Array.from({ length: binCount }, (_, i) => ({
      start: min + i * binWidth,
      end: min + (i + 1) * binWidth,
      count: 0,
      isOutlier: false,
    }));

    times.forEach(t => {
      const binIdx = Math.min(Math.floor((t - min) / binWidth), binCount - 1);
      if (binIdx >= 0 && binIdx < bins.length) {
        bins[binIdx].count++;
        // Mark as outlier if outside thresholds
        if (thresholdLow !== null && thresholdHigh !== null) {
          if (t < thresholdLow || t > thresholdHigh) {
            bins[binIdx].isOutlier = true;
          }
        }
      }
    });

    return {
      bins: bins.map(b => ({
        range: `${Math.round(b.start)}-${Math.round(b.end)}`,
        label: Math.round((b.start + b.end) / 2),
        count: b.count,
        isOutlier: b.isOutlier,
      })),
      mean,
      thresholdLow,
      thresholdHigh,
    };
  }, [patternDetails]);

  if (loading) {
    return (
      <div className="patterns-tab">
        <div className="card"><p>Loading patterns...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="patterns-tab">
        <div className="card">
          <p className="error">Error: {error}</p>
          <button onClick={loadPatterns}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="patterns-tab">
      {/* Controls Row */}
      <div className="patterns-controls">
        <div className="controls-left">
          <div className="toggle-group">
            <button
              className={viewMode === 'digraphs' ? 'active' : ''}
              onClick={() => setViewMode('digraphs')}
            >
              Digraphs
            </button>
            <button
              className={viewMode === 'trigraphs' ? 'active' : ''}
              onClick={() => setViewMode('trigraphs')}
            >
              Trigraphs
            </button>
          </div>
          <select
            value={modeFilter || ''}
            onChange={(e) => setModeFilter(e.target.value || null)}
            className="mode-filter"
          >
            <option value="">All Data</option>
            <option value="top200">Top 200</option>
            <option value="trigraph_test">Trigraph Test</option>
          </select>
        </div>
        <div className="controls-right">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="avg_time">Speed</option>
            <option value="count">Frequency</option>
            <option value="pattern">Alphabetical</option>
          </select>
          <button
            className="sort-order"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? 'ASC' : 'DESC'}
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="patterns-summary">
        <span>{currentPatterns.length} patterns</span>
        <span>|</span>
        <span>Avg: {currentPatterns.length > 0 ? Math.round(currentPatterns.reduce((s, p) => s + p.avg_time, 0) / currentPatterns.length) : 0}ms</span>
        <span>|</span>
        <span>Total samples: {currentPatterns.reduce((s, p) => s + p.count, 0).toLocaleString()}</span>
      </div>

      {/* Pattern List */}
      <div className="patterns-list">
        {currentPatterns.slice(0, 150).map((p, idx) => {
          const archetype = viewMode === 'digraphs' ? classifyDigraph(p.pattern) : null;
          return (
            <div
              key={idx}
              className={`pattern-row ${selectedPattern?.pattern === p.pattern ? 'selected' : ''} speed-${getSpeedIndicator(p, currentPatterns)}`}
              onClick={() => handlePatternClick(p)}
            >
              <span className="pattern-name">{p.pattern}</span>
              {archetype && (
                <span
                  className="pattern-archetype"
                  style={{ backgroundColor: archetype.color }}
                  title={archetype.description}
                >
                  {archetype.label}
                </span>
              )}
              <span className="pattern-time">{p.avg_time}ms</span>
              <span className="pattern-count">{p.count}x</span>
            </div>
          );
        })}
        {currentPatterns.length > 150 && (
          <div className="more-patterns">+ {currentPatterns.length - 150} more</div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedPattern && (
        <div className="pattern-detail-panel">
          <div className="detail-header">
            <div className="detail-title">
              <span className="detail-pattern">{selectedPattern.pattern}</span>
              <span className="detail-type">{selectedPattern.pattern.length === 2 ? 'digraph' : 'trigraph'}</span>
              {selectedPattern.pattern.length === 2 && (() => {
                const arch = classifyDigraph(selectedPattern.pattern);
                return (
                  <span
                    className="detail-archetype"
                    style={{ backgroundColor: arch.color }}
                    title={arch.description}
                  >
                    {arch.description}
                  </span>
                );
              })()}
            </div>
            <button className="close-detail" onClick={() => { setSelectedPattern(null); setPatternDetails(null); }}>Close</button>
          </div>

          <div className="detail-stats">
            <div className="stat-box primary">
              <span className="stat-value">{selectedPattern.avg_time}</span>
              <span className="stat-label">ms avg</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{selectedPattern.count}</span>
              <span className="stat-label">samples</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{selectedPattern.min_time}-{selectedPattern.max_time}</span>
              <span className="stat-label">ms range</span>
            </div>
            {selectedPattern.median_time && (
              <div className="stat-box">
                <span className="stat-value">{selectedPattern.median_time}</span>
                <span className="stat-label">ms median</span>
              </div>
            )}
            {selectedPattern.excluded_count > 0 && (
              <div className="stat-box outlier">
                <span className="stat-value">{selectedPattern.excluded_count}</span>
                <span className="stat-label">outliers</span>
              </div>
            )}
          </div>

          {loadingDetails ? (
            <div className="loading-details">Loading distribution...</div>
          ) : distributionData && (
            <div className="distribution-section">
              <h4>Timing Distribution</h4>
              <div className="distribution-chart">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={distributionData.bins} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: 'var(--text-dim)' }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border-light)' }}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                      formatter={(value, name, props) => [
                        `${value} occurrences`,
                        props.payload.isOutlier ? 'Outlier Range' : 'Normal Range'
                      ]}
                      labelFormatter={(label) => `~${label}ms`}
                    />
                    {distributionData.thresholdLow !== null && (
                      <ReferenceLine x={distributionData.thresholdLow} stroke="#f44336" strokeDasharray="3 3" />
                    )}
                    {distributionData.thresholdHigh !== null && (
                      <ReferenceLine x={distributionData.thresholdHigh} stroke="#f44336" strokeDasharray="3 3" />
                    )}
                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                      {distributionData.bins.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.isOutlier ? '#f44336' : '#4A90E2'}
                          opacity={entry.isOutlier ? 0.6 : 0.9}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  <span className="legend-normal">Normal</span>
                  <span className="legend-outlier">Outlier</span>
                </div>
              </div>
            </div>
          )}

          {patternDetails?.words && patternDetails.words.length > 0 && (
            <div className="words-section">
              <h4>Words ({patternDetails.words.length})</h4>
              <div className="words-list">
                {patternDetails.words.slice(0, 30).map((word, i) => {
                  const pattern = selectedPattern.pattern.toLowerCase();
                  const wordLower = word.toLowerCase();
                  const idx = wordLower.indexOf(pattern);
                  if (idx === -1) return <span key={i} className="word-tag">{word}</span>;
                  return (
                    <span key={i} className="word-tag">
                      {word.substring(0, idx)}
                      <mark>{word.substring(idx, idx + pattern.length)}</mark>
                      {word.substring(idx + pattern.length)}
                    </span>
                  );
                })}
                {patternDetails.words.length > 30 && (
                  <span className="more-words">+{patternDetails.words.length - 30} more</span>
                )}
              </div>
            </div>
          )}

          {patternDetails?.raw_times && patternDetails.raw_times.length > 0 && (
            <div className="raw-times-section">
              <h4>All Samples ({patternDetails.raw_times.length})</h4>
              <div className="times-flow">
                {patternDetails.raw_times.slice(0, 50).map((t, i) => {
                  const isOutlier = patternDetails.threshold_low !== null &&
                    (t < patternDetails.threshold_low || t > patternDetails.threshold_high);
                  return (
                    <span key={i} className={`time-tag ${isOutlier ? 'outlier' : ''}`}>
                      {Math.round(t)}
                    </span>
                  );
                })}
                {patternDetails.raw_times.length > 50 && (
                  <span className="more-times">+{patternDetails.raw_times.length - 50}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PatternsTab;
