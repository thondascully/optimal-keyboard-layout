/**
 * CollectionDashboard - Main dashboard for data collection phase.
 * Shows progress tracking, action items, and key metrics.
 */

import { useState, useEffect } from 'react';
import { useStats, useCoverage } from '../../../hooks';
import { MetricCard, ProgressGauge } from '../../common';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import './CollectionDashboard.css';

const TARGET_TRIGRAPHS = 500;
const MIN_SAMPLES_PER_PAIR = 5;

function CollectionDashboard() {
  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useStats();
  const { coverage, loading: coverageLoading, summary, gaps } = useCoverage();
  const [patterns, setPatterns] = useState(null);

  // Load patterns for additional metrics
  useEffect(() => {
    fetch('/api/patterns')
      .then(res => res.json())
      .then(data => setPatterns(data))
      .catch(err => console.error('Failed to load patterns:', err));
  }, []);

  const loading = statsLoading || coverageLoading;

  if (loading) {
    return (
      <div className="collection-dashboard">
        <div className="card">
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="collection-dashboard">
        <div className="card">
          <p className="error">Error: {statsError}</p>
          <button onClick={refetchStats}>Retry</button>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const totalTrigraphs = patterns?.trigraphs?.reduce((sum, t) => sum + t.count, 0) || 0;
  const trigraphProgress = Math.min(100, (totalTrigraphs / TARGET_TRIGRAPHS) * 100);
  const trigraphsNeeded = Math.max(0, TARGET_TRIGRAPHS - totalTrigraphs);

  const coveredPairs = summary?.covered_pairs || 0;
  const totalPairs = summary?.total_pairs || 64;
  const pairCoverage = (coveredPairs / totalPairs) * 100;

  const highPriorityGaps = gaps?.filter(g => g.priority === 'high').length || 0;
  const mediumPriorityGaps = gaps?.filter(g => g.priority === 'medium').length || 0;
  const totalGaps = gaps?.length || 0;

  // Sessions by mode for pie chart
  const sessionsByMode = stats?.sessions_by_mode || {};
  const modeData = Object.entries(sessionsByMode).map(([mode, count]) => ({
    name: mode,
    value: count,
  }));
  const COLORS = ['#4A90E2', '#4CAF50', '#FF9800', '#9C27B0', '#F44336'];

  // Action items
  const actionItems = [];

  if (trigraphsNeeded > 0) {
    actionItems.push({
      priority: 'high',
      icon: '📊',
      title: `Collect ${trigraphsNeeded} more trigraphs`,
      description: `Progress: ${totalTrigraphs}/${TARGET_TRIGRAPHS} (${trigraphProgress.toFixed(1)}%)`,
      action: 'Use Trigraph Test mode',
    });
  }

  if (highPriorityGaps > 0) {
    actionItems.push({
      priority: 'high',
      icon: '🔴',
      title: `${highPriorityGaps} finger pairs with 0 samples`,
      description: 'Critical gaps - no data collected yet',
      action: 'Use Stratified mode to target gaps',
    });
  }

  if (mediumPriorityGaps > 0) {
    actionItems.push({
      priority: 'medium',
      icon: '🟡',
      title: `${mediumPriorityGaps} finger pairs need more samples`,
      description: `Have 1-4 samples, need at least ${MIN_SAMPLES_PER_PAIR}`,
      action: 'Continue with Trigraph Test mode',
    });
  }

  if (actionItems.length === 0) {
    actionItems.push({
      priority: 'success',
      icon: '✅',
      title: 'All collection targets met!',
      description: 'You have sufficient data for PITF model training',
      action: 'Proceed to Validation phase',
    });
  }

  return (
    <div className="collection-dashboard">
      {/* Hero Metrics */}
      <div className="hero-section">
        <div className="hero-gauges">
          <div className="gauge-item">
            <ProgressGauge
              value={trigraphProgress}
              size="large"
              label="Trigraphs"
              valueFormatter={(v) => `${Math.round(v)}%`}
            />
            <div className="gauge-detail">{totalTrigraphs} / {TARGET_TRIGRAPHS}</div>
          </div>
          <div className="gauge-item">
            <ProgressGauge
              value={pairCoverage}
              size="large"
              label="Coverage"
              valueFormatter={(v) => `${Math.round(v)}%`}
            />
            <div className="gauge-detail">{coveredPairs} / {totalPairs} pairs</div>
          </div>
        </div>

        <div className="hero-cards">
          <MetricCard
            label="Total Sessions"
            value={stats?.total_sessions || 0}
            variant="default"
            size="medium"
          />
          <MetricCard
            label="Total Keystrokes"
            value={(stats?.total_keystrokes || 0).toLocaleString()}
            variant="default"
            size="medium"
          />
          <MetricCard
            label="Gaps Remaining"
            value={totalGaps}
            variant={totalGaps === 0 ? 'success' : totalGaps > 10 ? 'error' : 'warning'}
            size="medium"
          />
          <MetricCard
            label="Unique Digraphs"
            value={stats?.unique_digraphs || 0}
            variant="primary"
            size="medium"
          />
        </div>
      </div>

      {/* Action Items */}
      <div className="card action-items-card">
        <h3>What to Do Next</h3>
        <div className="action-items">
          {actionItems.map((item, idx) => (
            <div key={idx} className={`action-item priority-${item.priority}`}>
              <span className="action-icon">{item.icon}</span>
              <div className="action-content">
                <strong>{item.title}</strong>
                <span className="action-description">{item.description}</span>
                <span className="action-suggestion">{item.action}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-section">
        {/* Sessions by Mode */}
        {modeData.length > 0 && (
          <div className="card chart-card">
            <h3>Sessions by Mode</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={modeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {modeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value + ' sessions', name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-legend">
              {modeData.map((entry, index) => (
                <div key={index} className="legend-item">
                  <span className="legend-dot" style={{ background: COLORS[index % COLORS.length] }}></span>
                  <span>{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="card stats-summary-card">
          <h3>Collection Summary</h3>
          <div className="stats-grid">
            <div className="stat-row">
              <span className="stat-label">Avg Keystrokes/Session:</span>
              <span className="stat-value">{stats?.avg_keystrokes_per_session || 0}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Avg Characters/Session:</span>
              <span className="stat-value">{stats?.avg_characters_per_session || 0}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Sessions with Features:</span>
              <span className="stat-value">{stats?.sessions_with_features || 0}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Total Features:</span>
              <span className="stat-value">{(stats?.total_features || 0).toLocaleString()}</span>
            </div>
            {stats?.first_session_date && stats?.last_session_date && (
              <div className="stat-row">
                <span className="stat-label">Date Range:</span>
                <span className="stat-value">
                  {new Date(stats.first_session_date * 1000).toLocaleDateString()} - {new Date(stats.last_session_date * 1000).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pattern Overview */}
      {patterns && (patterns.digraphs?.length > 0 || patterns.trigraphs?.length > 0) && (
        <div className="card patterns-preview-card">
          <h3>Pattern Quick View</h3>
          <div className="patterns-preview">
            {patterns.digraphs?.length > 0 && (
              <div className="pattern-column">
                <h4>Fastest Digraphs</h4>
                <div className="pattern-list">
                  {patterns.digraphs.slice(0, 5).map((dg, idx) => (
                    <div key={idx} className="pattern-item-mini">
                      <span className="pattern-text">{dg.pattern}</span>
                      <span className="pattern-time">{dg.avg_time}ms</span>
                      <span className="pattern-count">{dg.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {patterns.trigraphs?.length > 0 && (
              <div className="pattern-column">
                <h4>Fastest Trigraphs</h4>
                <div className="pattern-list">
                  {patterns.trigraphs.slice(0, 5).map((tg, idx) => (
                    <div key={idx} className="pattern-item-mini">
                      <span className="pattern-text">{tg.pattern}</span>
                      <span className="pattern-time">{tg.avg_time}ms</span>
                      <span className="pattern-count">{tg.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CollectionDashboard;
