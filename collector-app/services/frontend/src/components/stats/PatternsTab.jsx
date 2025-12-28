/**
 * Patterns Tab - Clean pattern viewer with distribution charts.
 */

import { useState, useEffect } from 'react';
import { patternsApi } from '../../api/client';
import './PatternsTab.css';

function PatternsTab() {
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('digraphs');
  const [sortBy, setSortBy] = useState('avg_time');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [patternWords, setPatternWords] = useState([]);
  const [loadingWords, setLoadingWords] = useState(false);
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

  const getCurrentPatterns = () => {
    if (!patterns) return [];
    const list = viewMode === 'digraphs' ? patterns.digraphs : patterns.trigraphs;
    if (!list) return [];

    let filtered = list;
    if (searchTerm) {
      filtered = list.filter(p => p.pattern.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'avg_time') cmp = a.avg_time - b.avg_time;
      else if (sortBy === 'count') cmp = a.count - b.count;
      else if (sortBy === 'pattern') cmp = a.pattern.localeCompare(b.pattern);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return sorted;
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'count' ? 'desc' : 'asc');
    }
  };

  const handlePatternSelect = async (pattern) => {
    if (selectedPattern?.pattern === pattern.pattern) {
      setSelectedPattern(null);
      setPatternWords([]);
      return;
    }

    setSelectedPattern(pattern);
    setPatternWords([]);

    // Fetch word context for this pattern
    if (pattern.pattern.length >= 2) {
      setLoadingWords(true);
      try {
        const response = await fetch(`/api/digraph/${encodeURIComponent(pattern.pattern)}`);
        if (response.ok) {
          const details = await response.json();
          setPatternWords(details.words || []);
        }
      } catch (err) {
        console.error('Failed to load pattern words:', err);
      } finally {
        setLoadingWords(false);
      }
    }
  };

  const getSpeedClass = (avgTime, allPatterns) => {
    if (!allPatterns.length) return '';
    const sorted = [...allPatterns].sort((a, b) => a.avg_time - b.avg_time);
    const idx = sorted.findIndex(p => p.pattern === avgTime.pattern);
    const percentile = idx / sorted.length;
    if (percentile < 0.2) return 'speed-fast';
    if (percentile < 0.5) return 'speed-medium';
    if (percentile < 0.8) return 'speed-slow';
    return 'speed-slowest';
  };

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

  const currentPatterns = getCurrentPatterns();

  return (
    <div className="patterns-tab">
      {/* Controls */}
      <div className="card patterns-controls">
        <div className="controls-row">
          <div className="control-group">
            <div className="toggle-buttons">
              <button
                className={viewMode === 'digraphs' ? 'active' : ''}
                onClick={() => setViewMode('digraphs')}
              >
                Digraphs ({patterns?.total_digraphs || 0})
              </button>
              <button
                className={viewMode === 'trigraphs' ? 'active' : ''}
                onClick={() => setViewMode('trigraphs')}
              >
                Trigraphs ({patterns?.total_trigraphs || 0})
              </button>
            </div>
          </div>

          <div className="control-group">
            <select value={modeFilter || ''} onChange={(e) => setModeFilter(e.target.value || null)}>
              <option value="">All Data</option>
              <option value="top200">Top 200</option>
              <option value="trigraph_test">Trigraph Test</option>
            </select>
          </div>

          <div className="control-group search-group">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="sort-info">
          Sorted by: <strong>{sortBy === 'avg_time' ? 'Speed (fastest first)' : sortBy === 'count' ? 'Frequency' : 'Pattern'}</strong>
          {' '}
          <button className="sort-toggle" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Pattern Grid */}
      <div className="patterns-grid">
        {currentPatterns.slice(0, 100).map((p, idx) => (
          <div
            key={idx}
            className={`pattern-card ${selectedPattern?.pattern === p.pattern ? 'selected' : ''} ${getSpeedClass(p, currentPatterns)}`}
            onClick={() => handlePatternSelect(p)}
          >
            <div className="pattern-main">
              <span className="pattern-text">{p.pattern}</span>
            </div>
            <span className="pattern-time">{p.avg_time}ms</span>
            <span className="pattern-count">{p.count}x</span>
          </div>
        ))}
      </div>

      {currentPatterns.length > 100 && (
        <div className="more-info">Showing 100 of {currentPatterns.length} patterns</div>
      )}

      {/* Distribution Detail Panel */}
      {selectedPattern && (
        <div className="card distribution-panel">
          <div className="panel-header">
            <h3>
              <span className="pattern-highlight">{selectedPattern.pattern}</span>
              <span className="panel-time">{selectedPattern.avg_time}ms</span>
            </h3>
            <button className="close-btn" onClick={() => { setSelectedPattern(null); setPatternWords([]); }}>×</button>
          </div>

          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-label">Samples</span>
              <span className="stat-value">{selectedPattern.count}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Filtered Avg</span>
              <span className="stat-value highlight">{selectedPattern.avg_time}ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Raw Avg</span>
              <span className="stat-value">{selectedPattern.raw_avg_time}ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Median</span>
              <span className="stat-value">{selectedPattern.median_time}ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Range</span>
              <span className="stat-value">{selectedPattern.min_time}-{selectedPattern.max_time}ms</span>
            </div>
            {selectedPattern.excluded_count > 0 && (
              <div className="stat-item excluded">
                <span className="stat-label">Excluded</span>
                <span className="stat-value">{selectedPattern.excluded_count}</span>
              </div>
            )}
          </div>

          {/* Custom SVG Distribution Chart */}
          {selectedPattern.distribution && selectedPattern.distribution.length > 0 && (
            <div className="distribution-chart">
              <div className="chart-title">Timing Distribution</div>
              <DistributionChart
                data={selectedPattern.distribution}
                thresholdLow={selectedPattern.threshold_low}
                thresholdHigh={selectedPattern.threshold_high}
              />
              <div className="chart-legend">
                <span className="legend-item included">Included in average</span>
                <span className="legend-item excluded">Excluded (outlier)</span>
              </div>
            </div>
          )}

          {/* Words containing this pattern */}
          <div className="words-section">
            <div className="section-title">
              Words Containing Pattern
              {loadingWords && <span className="loading-indicator"> (loading...)</span>}
            </div>
            {patternWords.length > 0 ? (
              <div className="words-flow">
                {patternWords.map((word, i) => {
                  const pattern = selectedPattern.pattern.toLowerCase();
                  const wordLower = word.toLowerCase();
                  const patternIndex = wordLower.indexOf(pattern);

                  if (patternIndex === -1) {
                    return <span key={i} className="word-chip">{word}</span>;
                  }

                  return (
                    <span key={i} className="word-chip">
                      {word.substring(0, patternIndex)}
                      <span className="pattern-highlight-inline">
                        {word.substring(patternIndex, patternIndex + pattern.length)}
                      </span>
                      {word.substring(patternIndex + pattern.length)}
                    </span>
                  );
                })}
              </div>
            ) : !loadingWords && (
              <div className="no-words">No words found for this pattern</div>
            )}
          </div>

          {/* Raw Times */}
          {selectedPattern.raw_times && selectedPattern.raw_times.length > 0 && (
            <div className="raw-times-section">
              <div className="section-title">All Samples ({selectedPattern.raw_times.length})</div>
              <div className="raw-times-flow">
                {selectedPattern.raw_times.map((t, i) => {
                  const inRange = selectedPattern.threshold_low === null ||
                    (t >= selectedPattern.threshold_low && t <= selectedPattern.threshold_high);
                  return (
                    <span key={i} className={`time-chip ${inRange ? 'in' : 'out'}`}>
                      {t}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Custom SVG Distribution Chart - cleaner than Chart.js bars
function DistributionChart({ data, thresholdLow, thresholdHigh }) {
  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map(d => d.count));
  const chartHeight = 120;
  const chartWidth = 100;
  const barWidth = chartWidth / data.length;
  const barGap = 2;

  return (
    <div className="svg-chart-container">
      <svg viewBox={`0 0 ${chartWidth * data.length + 40} ${chartHeight + 40}`} className="distribution-svg">
        {/* Y-axis labels */}
        <text x="15" y="15" className="axis-label">{maxCount}</text>
        <text x="15" y={chartHeight / 2 + 10} className="axis-label">{Math.round(maxCount / 2)}</text>
        <text x="15" y={chartHeight + 5} className="axis-label">0</text>

        {/* Bars */}
        <g transform="translate(35, 0)">
          {data.map((bin, i) => {
            const barHeight = maxCount > 0 ? (bin.count / maxCount) * chartHeight : 0;
            const x = i * chartWidth + barGap;
            const y = chartHeight - barHeight;

            return (
              <g key={i}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={chartWidth - barGap * 2}
                  height={barHeight}
                  rx={4}
                  className={bin.in_range ? 'bar-included' : 'bar-excluded'}
                />
                {/* Count label on bar */}
                {bin.count > 0 && (
                  <text
                    x={x + (chartWidth - barGap * 2) / 2}
                    y={y - 5}
                    className="bar-label"
                  >
                    {bin.count}
                  </text>
                )}
                {/* X-axis label */}
                <text
                  x={x + (chartWidth - barGap * 2) / 2}
                  y={chartHeight + 20}
                  className="x-label"
                >
                  {bin.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

export default PatternsTab;
