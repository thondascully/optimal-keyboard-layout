/**
 * Data Viewer Tab - Organized by data categories (fingers, keys, timing).
 */

import { useState, useEffect, useMemo } from 'react';
import { keystrokesApi, sessionApi } from '../../api/client';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from 'recharts';
import './DataViewerTab.css';

const FINGER_NAMES = {
  'left_pinky': 'L. Pinky',
  'left_ring': 'L. Ring',
  'left_middle': 'L. Middle',
  'left_index': 'L. Index',
  'right_index': 'R. Index',
  'right_middle': 'R. Middle',
  'right_ring': 'R. Ring',
  'right_pinky': 'R. Pinky',
  'right_thumb': 'R. Thumb',
};

const FINGER_ORDER = [
  'left_pinky', 'left_ring', 'left_middle', 'left_index',
  'right_index', 'right_middle', 'right_ring', 'right_pinky'
];

function DataViewerTab() {
  const [keystrokesData, setKeystrokesData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [keystrokesRes, sessionsRes] = await Promise.all([
        keystrokesApi.getData(20000, 0),
        sessionApi.list(1000),
      ]);
      setKeystrokesData(keystrokesRes);
      setSessions(sessionsRes.sessions || []);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Compute all statistics
  const stats = useMemo(() => {
    if (!keystrokesData?.keystrokes) return null;

    const ks = keystrokesData.keystrokes;

    // Finger stats
    const fingerCounts = {};
    const fingerTimings = {};
    ks.forEach(k => {
      if (k.finger) {
        fingerCounts[k.finger] = (fingerCounts[k.finger] || 0) + 1;
        if (!fingerTimings[k.finger]) fingerTimings[k.finger] = [];
        if (k.duration > 0 && k.duration < 2000) {
          fingerTimings[k.finger].push(k.duration);
        }
      }
    });

    // Key frequency
    const keyCounts = {};
    ks.forEach(k => {
      const key = k.key === ' ' ? 'SPACE' : k.key;
      keyCounts[key] = (keyCounts[key] || 0) + 1;
    });

    // Mode breakdown
    const modeCounts = {};
    ks.forEach(k => {
      if (k.mode) modeCounts[k.mode] = (modeCounts[k.mode] || 0) + 1;
    });

    // Hand balance
    const leftCount = Object.entries(fingerCounts)
      .filter(([f]) => f.startsWith('left'))
      .reduce((sum, [, c]) => sum + c, 0);
    const rightCount = Object.entries(fingerCounts)
      .filter(([f]) => f.startsWith('right'))
      .reduce((sum, [, c]) => sum + c, 0);
    const total = leftCount + rightCount;

    // Timing stats per finger
    const fingerAvgTiming = {};
    Object.entries(fingerTimings).forEach(([finger, times]) => {
      if (times.length > 0) {
        fingerAvgTiming[finger] = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      }
    });

    // Top digraphs by frequency (from raw keystrokes)
    const digraphCounts = {};
    for (let i = 1; i < ks.length; i++) {
      if (ks[i].session_id === ks[i-1].session_id) {
        const digraph = ks[i-1].key + ks[i].key;
        if (digraph.length === 2 && !digraph.includes(' ')) {
          digraphCounts[digraph] = (digraphCounts[digraph] || 0) + 1;
        }
      }
    }

    return {
      total: ks.length,
      sessions: sessions.length,
      fingerData: FINGER_ORDER
        .filter(f => fingerCounts[f])
        .map(f => ({
          name: FINGER_NAMES[f] || f,
          finger: f,
          count: fingerCounts[f],
          percent: ((fingerCounts[f] / total) * 100).toFixed(1),
          avgTime: fingerAvgTiming[f] || 0,
        })),
      keyData: Object.entries(keyCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 26)
        .map(([key, count]) => ({ key, count, percent: ((count / ks.length) * 100).toFixed(1) })),
      modeData: Object.entries(modeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([mode, count]) => ({ mode, count })),
      handBalance: {
        left: total > 0 ? ((leftCount / total) * 100).toFixed(1) : 50,
        right: total > 0 ? ((rightCount / total) * 100).toFixed(1) : 50,
        leftCount,
        rightCount,
      },
      topDigraphs: Object.entries(digraphCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([digraph, count]) => ({ digraph, count })),
    };
  }, [keystrokesData, sessions]);

  if (loading) {
    return (
      <div className="data-viewer-tab">
        <div className="card"><p>Loading data...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-viewer-tab">
        <div className="card">
          <p className="error">Error: {error}</p>
          <button onClick={loadData}>Retry</button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="data-viewer-tab">
        <div className="card"><p>No data available.</p></div>
      </div>
    );
  }

  const COLORS = ['#4A90E2', '#50C878', '#FF9800', '#9C27B0', '#E91E63', '#00BCD4', '#8BC34A', '#FF5722'];

  return (
    <div className="data-viewer-tab">
      {/* View Tabs */}
      <div className="view-tabs">
        <button className={activeView === 'overview' ? 'active' : ''} onClick={() => setActiveView('overview')}>
          Overview
        </button>
        <button className={activeView === 'fingers' ? 'active' : ''} onClick={() => setActiveView('fingers')}>
          Fingers
        </button>
        <button className={activeView === 'keys' ? 'active' : ''} onClick={() => setActiveView('keys')}>
          Keys
        </button>
        <button className={activeView === 'timing' ? 'active' : ''} onClick={() => setActiveView('timing')}>
          Timing
        </button>
      </div>

      {/* Overview */}
      {activeView === 'overview' && (
        <div className="overview-grid">
          <div className="stat-card large">
            <div className="stat-value">{stats.total.toLocaleString()}</div>
            <div className="stat-label">Total Keystrokes</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.sessions}</div>
            <div className="stat-label">Sessions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.keyData.length}</div>
            <div className="stat-label">Unique Keys</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{Math.round(stats.total / stats.sessions) || 0}</div>
            <div className="stat-label">Avg per Session</div>
          </div>

          {/* Hand Balance */}
          <div className="balance-card">
            <h4>Hand Balance</h4>
            <div className="balance-bar">
              <div className="left-side" style={{ width: `${stats.handBalance.left}%` }}>
                L {stats.handBalance.left}%
              </div>
              <div className="right-side" style={{ width: `${stats.handBalance.right}%` }}>
                R {stats.handBalance.right}%
              </div>
            </div>
            <div className="balance-counts">
              <span>{stats.handBalance.leftCount.toLocaleString()} left</span>
              <span>{stats.handBalance.rightCount.toLocaleString()} right</span>
            </div>
          </div>

          {/* Mode Breakdown */}
          <div className="mode-card">
            <h4>By Mode</h4>
            <div className="mode-list">
              {stats.modeData.map((m, i) => (
                <div key={m.mode} className="mode-item">
                  <span className="mode-dot" style={{ background: COLORS[i % COLORS.length] }}></span>
                  <span className="mode-name">{m.mode}</span>
                  <span className="mode-count">{m.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Digraphs */}
          <div className="digraph-card">
            <h4>Most Typed Digraphs</h4>
            <div className="digraph-list">
              {stats.topDigraphs.slice(0, 10).map((d, i) => (
                <div key={d.digraph} className="digraph-item">
                  <span className="digraph-rank">{i + 1}</span>
                  <span className="digraph-text">{d.digraph}</span>
                  <span className="digraph-count">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fingers View */}
      {activeView === 'fingers' && (
        <div className="fingers-view">
          <div className="finger-chart-section">
            <h4>Keystroke Distribution by Finger</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.fingerData} layout="vertical" margin={{ left: 70, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={65} />
                <Tooltip
                  formatter={(value) => [value.toLocaleString(), 'Keystrokes']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '4px' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {stats.fingerData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.finger.startsWith('left') ? '#4A90E2' : '#50C878'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="finger-table">
            <div className="table-header">
              <span>Finger</span>
              <span>Count</span>
              <span>Percent</span>
              <span>Avg Time</span>
            </div>
            {stats.fingerData.map(f => (
              <div key={f.finger} className={`table-row ${f.finger.startsWith('left') ? 'left' : 'right'}`}>
                <span className="finger-name">{f.name}</span>
                <span className="finger-count">{f.count.toLocaleString()}</span>
                <span className="finger-percent">{f.percent}%</span>
                <span className="finger-time">{f.avgTime}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keys View */}
      {activeView === 'keys' && (
        <div className="keys-view">
          <h4>Key Frequency (Top 26)</h4>
          <div className="keys-chart">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.keyData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                <XAxis
                  dataKey="key"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [value.toLocaleString(), 'Count']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '4px' }}
                />
                <Bar dataKey="count" fill="#4A90E2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="keys-grid">
            {stats.keyData.map(k => (
              <div key={k.key} className="key-item">
                <span className="key-char">{k.key}</span>
                <span className="key-count">{k.count.toLocaleString()}</span>
                <span className="key-percent">{k.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timing View */}
      {activeView === 'timing' && (
        <div className="timing-view">
          <h4>Average Timing by Finger</h4>
          <div className="timing-chart">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={stats.fingerData.filter(f => f.avgTime > 0)}
                layout="vertical"
                margin={{ left: 70, right: 20 }}
              >
                <XAxis type="number" tick={{ fontSize: 11 }} unit="ms" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={65} />
                <Tooltip
                  formatter={(value) => [`${value}ms`, 'Avg Time']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '4px' }}
                />
                <Bar dataKey="avgTime" radius={[0, 4, 4, 0]}>
                  {stats.fingerData.map((entry, index) => {
                    const avg = stats.fingerData.reduce((s, f) => s + f.avgTime, 0) / stats.fingerData.length;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.avgTime < avg ? '#4caf50' : entry.avgTime > avg * 1.2 ? '#f44336' : '#ff9800'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="timing-summary">
            <div className="timing-stat">
              <span className="timing-label">Fastest Finger</span>
              <span className="timing-value">
                {stats.fingerData.filter(f => f.avgTime > 0).sort((a, b) => a.avgTime - b.avgTime)[0]?.name || '-'}
              </span>
            </div>
            <div className="timing-stat">
              <span className="timing-label">Slowest Finger</span>
              <span className="timing-value">
                {stats.fingerData.filter(f => f.avgTime > 0).sort((a, b) => b.avgTime - a.avgTime)[0]?.name || '-'}
              </span>
            </div>
            <div className="timing-stat">
              <span className="timing-label">Overall Average</span>
              <span className="timing-value">
                {Math.round(stats.fingerData.filter(f => f.avgTime > 0).reduce((s, f) => s + f.avgTime, 0) / stats.fingerData.filter(f => f.avgTime > 0).length) || 0}ms
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataViewerTab;
