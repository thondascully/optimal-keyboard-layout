/**
 * Data Viewer Tab - Organized by session with expandable keystroke details.
 */

import { useState, useEffect, useMemo } from 'react';
import { keystrokesApi, sessionApi } from '../../api/client';
import './DataViewerTab.css';

function DataViewerTab() {
  const [sessions, setSessions] = useState([]);
  const [keystrokesData, setKeystrokesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSessions, setExpandedSessions] = useState(new Set());
  const [viewMode, setViewMode] = useState('sessions'); // 'sessions' | 'stats'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsRes, keystrokesRes] = await Promise.all([
        sessionApi.list(1000),
        keystrokesApi.getData(10000, 0),
      ]);
      setSessions(sessionsRes.sessions || []);
      setKeystrokesData(keystrokesRes);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Group keystrokes by session
  const sessionData = useMemo(() => {
    if (!keystrokesData?.keystrokes || !sessions.length) return [];

    const grouped = {};
    keystrokesData.keystrokes.forEach(ks => {
      if (!grouped[ks.session_id]) {
        grouped[ks.session_id] = [];
      }
      grouped[ks.session_id].push(ks);
    });

    return sessions.map(session => ({
      ...session,
      keystrokes: grouped[session.id] || [],
      keystroke_count: grouped[session.id]?.length || 0,
    })).filter(s => s.keystroke_count > 0).sort((a, b) => b.timestamp - a.timestamp);
  }, [sessions, keystrokesData]);

  // Compute statistics
  const stats = useMemo(() => {
    if (!keystrokesData?.keystrokes) return null;

    const ks = keystrokesData.keystrokes;
    const byFinger = {};
    const byHand = {};
    const byKey = {};
    const byMode = {};

    ks.forEach(k => {
      if (k.finger) byFinger[k.finger] = (byFinger[k.finger] || 0) + 1;
      if (k.hand) byHand[k.hand] = (byHand[k.hand] || 0) + 1;
      byKey[k.key] = (byKey[k.key] || 0) + 1;
      if (k.mode) byMode[k.mode] = (byMode[k.mode] || 0) + 1;
    });

    // Sort by count
    const sortedFinger = Object.entries(byFinger).sort((a, b) => b[1] - a[1]);
    const sortedKey = Object.entries(byKey).sort((a, b) => b[1] - a[1]);
    const sortedMode = Object.entries(byMode).sort((a, b) => b[1] - a[1]);

    // Calculate finger balance
    const leftCount = Object.entries(byFinger)
      .filter(([f]) => f.startsWith('left'))
      .reduce((sum, [, c]) => sum + c, 0);
    const rightCount = Object.entries(byFinger)
      .filter(([f]) => f.startsWith('right'))
      .reduce((sum, [, c]) => sum + c, 0);
    const total = leftCount + rightCount;
    const balance = total > 0 ? (leftCount / total * 100).toFixed(1) : 50;

    return {
      total: ks.length,
      sessions: sessionData.length,
      byFinger: sortedFinger,
      byHand,
      byKey: sortedKey.slice(0, 20),
      byMode: sortedMode,
      leftHandPercent: balance,
      rightHandPercent: (100 - parseFloat(balance)).toFixed(1),
      avgKeystrokesPerSession: sessionData.length > 0
        ? Math.round(ks.length / sessionData.length)
        : 0,
    };
  }, [keystrokesData, sessionData]);

  const toggleSession = (sessionId) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  if (loading) {
    return (
      <div className="data-viewer-tab">
        <div className="card">
          <p>Loading data...</p>
        </div>
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

  return (
    <div className="data-viewer-tab">
      {/* Controls */}
      <div className="card viewer-controls">
        <div className="controls-row">
          <div className="toggle-buttons">
            <button
              className={viewMode === 'sessions' ? 'active' : ''}
              onClick={() => setViewMode('sessions')}
            >
              By Session
            </button>
            <button
              className={viewMode === 'stats' ? 'active' : ''}
              onClick={() => setViewMode('stats')}
            >
              Statistics
            </button>
          </div>
          <button className="refresh-btn" onClick={loadData}>Refresh</button>
        </div>

        <div className="quick-stats">
          <span>{stats?.total.toLocaleString() || 0} keystrokes</span>
          <span>{stats?.sessions || 0} sessions</span>
          <span>{stats?.avgKeystrokesPerSession || 0} avg/session</span>
        </div>
      </div>

      {/* Sessions View */}
      {viewMode === 'sessions' && (
        <div className="sessions-list">
          {sessionData.map(session => (
            <div key={session.id} className="session-card card">
              <div
                className="session-header"
                onClick={() => toggleSession(session.id)}
              >
                <div className="session-info">
                  <span className="session-id">Session #{session.id}</span>
                  <span className="session-mode">{session.mode}</span>
                  <span className="session-date">
                    {new Date(session.timestamp * 1000).toLocaleString()}
                  </span>
                </div>
                <div className="session-meta">
                  <span className="keystroke-count">{session.keystroke_count} keys</span>
                  <span className="expand-icon">
                    {expandedSessions.has(session.id) ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {expandedSessions.has(session.id) && (
                <div className="session-details">
                  {session.raw_text && (
                    <div className="session-text">
                      <strong>Text:</strong> {session.raw_text}
                    </div>
                  )}

                  <div className="keystrokes-grid">
                    {session.keystrokes.map((ks, idx) => (
                      <div key={ks.id} className="keystroke-item">
                        <span className="ks-key">{ks.key === ' ' ? '␣' : ks.key}</span>
                        <span className="ks-finger">{ks.finger || '-'}</span>
                        <span className="ks-time">{(ks.timestamp % 10000).toFixed(0)}ms</span>
                      </div>
                    ))}
                  </div>

                  <div className="session-summary">
                    <div className="summary-stat">
                      <span className="stat-label">Unique fingers:</span>
                      <span className="stat-value">
                        {new Set(session.keystrokes.map(k => k.finger).filter(Boolean)).size}
                      </span>
                    </div>
                    <div className="summary-stat">
                      <span className="stat-label">Unique keys:</span>
                      <span className="stat-value">
                        {new Set(session.keystrokes.map(k => k.key)).size}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {sessionData.length === 0 && (
            <div className="card">
              <p className="empty-state">No session data available.</p>
            </div>
          )}
        </div>
      )}

      {/* Statistics View */}
      {viewMode === 'stats' && stats && (
        <div className="stats-view">
          {/* Hand Balance */}
          <div className="card stats-section">
            <h4>Hand Balance</h4>
            <div className="balance-bar">
              <div
                className="left-bar"
                style={{ width: `${stats.leftHandPercent}%` }}
              >
                Left {stats.leftHandPercent}%
              </div>
              <div
                className="right-bar"
                style={{ width: `${stats.rightHandPercent}%` }}
              >
                Right {stats.rightHandPercent}%
              </div>
            </div>
          </div>

          {/* Finger Distribution */}
          <div className="card stats-section">
            <h4>Finger Distribution</h4>
            <div className="finger-bars">
              {stats.byFinger.map(([finger, count]) => {
                const percent = ((count / stats.total) * 100).toFixed(1);
                return (
                  <div key={finger} className="finger-row">
                    <span className="finger-name">{finger}</span>
                    <div className="finger-bar-container">
                      <div
                        className={`finger-bar ${finger.startsWith('left') ? 'left' : 'right'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="finger-count">{count} ({percent}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Keys */}
          <div className="card stats-section">
            <h4>Most Typed Keys</h4>
            <div className="keys-grid">
              {stats.byKey.map(([key, count]) => (
                <div key={key} className="key-item">
                  <span className="key-char">{key === ' ' ? 'SPACE' : key}</span>
                  <span className="key-count">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By Mode */}
          <div className="card stats-section">
            <h4>Keystrokes by Mode</h4>
            <div className="mode-list">
              {stats.byMode.map(([mode, count]) => (
                <div key={mode} className="mode-item">
                  <span className="mode-name">{mode}</span>
                  <span className="mode-count">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataViewerTab;
