import { useState, useEffect } from 'react'
import {
  BarChart, Bar as RechartsBar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, ReferenceLine
} from 'recharts'
// Keep Chart.js for the keystroke timing chart (has complex click interactions)
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import CoverageTab from './stats/CoverageTab'
import DeviationTab from './stats/DeviationTab'
import PatternsTab from './stats/PatternsTab'
import DataViewerTab from './stats/DataViewerTab'
import './StatsView.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

function StatsView({ onClose }) {
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState(null)
  const [patterns, setPatterns] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedSession, setSelectedSession] = useState(null)
  const [selectedDigraph, setSelectedDigraph] = useState(null)
  const [calculatingPatterns, setCalculatingPatterns] = useState(false)
  const [editingKeystrokes, setEditingKeystrokes] = useState(false)
  const [selectedKeystrokeIndex, setSelectedKeystrokeIndex] = useState(null)
  const [showDigraphModal, setShowDigraphModal] = useState(false)
  const [cropStart, setCropStart] = useState(0)
  const [cropEnd, setCropEnd] = useState(null)
  const [localKeystrokes, setLocalKeystrokes] = useState(null)
  const [deletionFeedback, setDeletionFeedback] = useState(null)
  const [keystrokesData, setKeystrokesData] = useState(null)
  const [dataViewMode, setDataViewMode] = useState('all') // 'all', 'by_finger', 'by_hand', 'by_key'
  const [dataLoading, setDataLoading] = useState(false)
  const [editingLabel, setEditingLabel] = useState(null) // session id being edited
  const [labelInput, setLabelInput] = useState('')
  const [patternFilter, setPatternFilter] = useState('combined') // 'top200', 'trigraph_test', 'combined'
  const [sessionModeFilter, setSessionModeFilter] = useState('all') // 'all', 'top200', 'trigraph_test', etc.

  // Get theme-aware colors
  const getChartColors = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    return {
      text: isDark ? '#e0e0e0' : '#000000',
      textSub: isDark ? '#b0b0b0' : '#333333',
      grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      accent: isDark ? '#5ba3f5' : '#4A90E2',
      error: isDark ? '#ff4444' : '#C00000'
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Load patterns when filter changes (for both overview and patterns tabs)
  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'patterns') {
      loadPatterns(patternFilter)
    }
  }, [patternFilter, activeTab])

  const loadPatterns = async (filter = 'combined') => {
    try {
      const url = filter === 'combined' ? '/api/patterns' : `/api/patterns?mode=${filter}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setPatterns(data)
      } else {
        console.error('Failed to load patterns:', response.status)
        // Set empty patterns if filter returns no data
        setPatterns({ digraphs: [], trigraphs: [], fastest_transitions: [], slowest_transitions: [] })
      }
    } catch (err) {
      console.error('Failed to load patterns:', err)
      setPatterns({ digraphs: [], trigraphs: [], fastest_transitions: [], slowest_transitions: [] })
    }
  }

  const loadData = async (loadPatterns = false) => {
    try {
      const promises = [
        fetch('/api/sessions?limit=1000'), // Get all sessions
        fetch('/api/stats')
      ]
      
      if (loadPatterns) {
        promises.push(fetch('/api/patterns'))
      }
      
      const [sessionsRes, statsRes, patternsRes] = await Promise.all(promises)
      
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json()
        setSessions(sessionsData.sessions || [])
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      } else {
        console.error('Failed to load stats:', statsRes.status, statsRes.statusText)
        // Set empty stats object so UI can render
        setStats({
          total_sessions: 0,
          total_keystrokes: 0,
          total_characters: 0,
          sessions_by_mode: {},
          avg_keystrokes_per_session: 0,
          avg_characters_per_session: 0,
          unique_digraphs: 0,
          sessions_with_features: 0,
          total_features: 0
        })
      }
      
      if (loadPatterns && patternsRes && patternsRes.ok) {
        const patternsData = await patternsRes.json()
        setPatterns(patternsData)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      // Set empty stats object so UI can render even on error
      setStats({
        total_sessions: 0,
        total_keystrokes: 0,
        total_characters: 0,
        sessions_by_mode: {},
        avg_keystrokes_per_session: 0,
        avg_characters_per_session: 0,
        unique_digraphs: 0,
        sessions_with_features: 0,
        total_features: 0
      })
    } finally {
      setLoading(false)
    }
  }

  // Load patterns for overview
  useEffect(() => {
    if (activeTab === 'overview' && !patterns) {
      fetch('/api/patterns')
        .then(res => res.json())
        .then(data => setPatterns(data))
        .catch(err => console.error('Failed to load patterns:', err))
    }
  }, [activeTab])

  const loadKeystrokesData = async () => {
    setDataLoading(true)
    try {
      const response = await fetch('/api/keystrokes/data?limit=5000')
      if (response.ok) {
        const data = await response.json()
        setKeystrokesData(data)
      } else {
        console.error('Failed to load keystrokes data:', response.status)
      }
    } catch (err) {
      console.error('Failed to load keystrokes data:', err)
    } finally {
      setDataLoading(false)
    }
  }

  const recalculatePatterns = async () => {
    setCalculatingPatterns(true)
    try {
      const url = patternFilter === 'combined' ? '/api/patterns' : `/api/patterns?mode=${patternFilter}`
      const response = await fetch(url)
      if (response.ok) {
        const patternsData = await response.json()
        setPatterns(patternsData)
      }
    } catch (err) {
      console.error('Failed to recalculate patterns:', err)
    } finally {
      setCalculatingPatterns(false)
    }
  }

  const handleSaveLabel = async (sessionId) => {
    try {
      const response = await fetch(`/api/session/${sessionId}/label`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ label: labelInput.trim() || null })
      })
      
      if (response.ok) {
        // Update the session in the list
        setSessions(prev => prev.map(s => 
          s.id === sessionId ? { ...s, label: labelInput.trim() || null } : s
        ))
        // Update selected session if it's the one being edited
        if (selectedSession && selectedSession.id === sessionId) {
          setSelectedSession(prev => ({ ...prev, label: labelInput.trim() || null }))
        }
        setEditingLabel(null)
        setLabelInput('')
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        console.error('Failed to update label:', errorData)
        alert(`Failed to update label: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Failed to update label:', err)
      alert('Failed to update label')
    }
  }

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this session? This will also delete all associated keystrokes and pattern data.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Reload sessions and stats
        await loadData()
        if (selectedSession && selectedSession.id === sessionId) {
          setSelectedSession(null)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(`Failed to delete session: ${errorData.detail || response.statusText}`)
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
      alert(`Failed to delete session: ${err.message}`)
    }
  }

  const handleDigraphClick = async (digraph) => {
    // Fetch detailed digraph information
    try {
      const pattern = digraph.pattern.replace(/"/g, '') // Remove quotes if present
      const response = await fetch(`/api/digraph/${encodeURIComponent(pattern)}`)
      if (response.ok) {
        const details = await response.json()
        setSelectedDigraph({ ...digraph, details })
        setShowDigraphModal(true)
      } else {
        // Fallback: show basic info
        setSelectedDigraph(digraph)
        setShowDigraphModal(true)
      }
    } catch (err) {
      console.error('Failed to load digraph details:', err)
      setSelectedDigraph(digraph)
      setShowDigraphModal(true)
    }
  }

  const handleSessionClick = async (sessionId) => {
    try {
      const response = await fetch(`/api/session/${sessionId}`)
      if (response.ok) {
        const sessionData = await response.json()
        setSelectedSession(sessionData)
        if (sessionData.keystrokes) {
          setLocalKeystrokes(sessionData.keystrokes)
          setCropStart(0)
          setCropEnd(sessionData.keystrokes.length - 1)
        }
      }
    } catch (err) {
      console.error('Failed to load session:', err)
    }
  }

  const getDisplayKeystrokes = () => {
    if (!localKeystrokes) return selectedSession?.keystrokes || []
    const end = cropEnd !== null ? cropEnd + 1 : localKeystrokes.length
    return localKeystrokes.slice(cropStart, end)
  }

  const handleApplyCrop = () => {
    if (!localKeystrokes) return
    const end = cropEnd !== null ? cropEnd + 1 : localKeystrokes.length
    const cropped = localKeystrokes.slice(cropStart, end)
    
    // Update timestamps to start from 0
    const firstTimestamp = cropped[0]?.timestamp || 0
    const adjusted = cropped.map((ks, i) => ({
      ...ks,
      timestamp: ks.timestamp - firstTimestamp
    }))
    
    setLocalKeystrokes(adjusted)
    setCropStart(0)
    setCropEnd(adjusted.length - 1)
    
    // Update selectedSession with cropped keystrokes
    setSelectedSession(prev => ({
      ...prev,
      keystrokes: adjusted
    }))
  }

  // Don't show loading screen for overview if we're just waiting for stats
  // The overview tab will show its own loading state

  return (
    <div className="stats-view fade-in">
      <div className="stats-header">
        <button onClick={onClose} className="close-button">×</button>
      </div>

      <div className="stats-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'sessions' ? 'active' : ''}
          onClick={() => setActiveTab('sessions')}
        >
          Sessions
        </button>
        <button 
          className={activeTab === 'patterns' ? 'active' : ''}
          onClick={() => setActiveTab('patterns')}
        >
          Patterns
        </button>
        <button 
          className={activeTab === 'database' ? 'active' : ''}
          onClick={() => setActiveTab('database')}
        >
          Database
        </button>
        <button
          className={activeTab === 'data' ? 'active' : ''}
          onClick={() => {
            setActiveTab('data')
            if (!keystrokesData) {
              loadKeystrokesData()
            }
          }}
        >
          Data Viewer
        </button>
        <button
          className={activeTab === 'coverage' ? 'active' : ''}
          onClick={() => setActiveTab('coverage')}
        >
          Coverage
        </button>
        <button
          className={activeTab === 'deviations' ? 'active' : ''}
          onClick={() => setActiveTab('deviations')}
        >
          Deviations
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {stats && Object.keys(stats).length > 0 ? (
            <>
              {/* Metric Cards Grid */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-value">{stats.total_sessions || 0}</div>
                  <div className="metric-label">Sessions</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{(stats.total_keystrokes || 0).toLocaleString()}</div>
                  <div className="metric-label">Keystrokes</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{(stats.unique_digraphs || 0).toLocaleString()}</div>
                  <div className="metric-label">Unique Digraphs</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{(stats.total_features || 0).toLocaleString()}</div>
                  <div className="metric-label">Features</div>
                </div>
              </div>

              {/* Sessions by Mode + Collection Details */}
              <div className="overview-row">
                {stats.sessions_by_mode && Object.keys(stats.sessions_by_mode).length > 0 && (
                  <div className="card overview-card">
                    <h3>Sessions by Mode</h3>
                    <div className="mode-chart-container">
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={Object.entries(stats.sessions_by_mode).map(([mode, count]) => ({ name: mode, value: count }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {Object.entries(stats.sessions_by_mode).map((_, idx) => (
                              <Cell key={idx} fill={['#4A90E2', '#50C878', '#FF9800', '#9C27B0', '#E91E63'][idx % 5]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value, name) => [`${value} sessions`, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mode-legend">
                        {Object.entries(stats.sessions_by_mode).map(([mode, count], idx) => (
                          <div key={mode} className="legend-item">
                            <span className="legend-dot" style={{ background: ['#4A90E2', '#50C878', '#FF9800', '#9C27B0', '#E91E63'][idx % 5] }}></span>
                            <span className="legend-text">{mode}</span>
                            <span className="legend-count">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div className="card overview-card">
                  <h3>Collection Details</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Avg Keystrokes/Session</span>
                      <span className="detail-value">{stats.avg_keystrokes_per_session || 0}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Avg Characters/Session</span>
                      <span className="detail-value">{stats.avg_characters_per_session || 0}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Sessions with Features</span>
                      <span className="detail-value">{stats.sessions_with_features || 0}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Total Characters</span>
                      <span className="detail-value">{(stats.total_characters || 0).toLocaleString()}</span>
                    </div>
                    {stats.first_session_date && stats.last_session_date && (
                      <div className="detail-item full-width">
                        <span className="detail-label">Date Range</span>
                        <span className="detail-value">
                          {new Date(stats.first_session_date * 1000).toLocaleDateString()} - {new Date(stats.last_session_date * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : loading ? (
            <div className="card">
              <div className="loading">Loading statistics...</div>
            </div>
          ) : (
            <div className="card">
              <div className="error-message">Failed to load statistics. Please try refreshing.</div>
            </div>
          )}

          {patterns && (
            <>
              <div className="card">
                <div className="pattern-filter-controls">
                  <label htmlFor="pattern-filter">Data Source: </label>
                  <select
                    id="pattern-filter"
                    value={patternFilter}
                    onChange={(e) => setPatternFilter(e.target.value)}
                  >
                    <option value="combined">Combined (All Data)</option>
                    <option value="top200">Top 200 Only</option>
                    <option value="trigraph_test">Trigraph Test Only</option>
                  </select>
                </div>
              </div>
              {(!patterns.digraphs || patterns.digraphs.length === 0) && (!patterns.trigraphs || patterns.trigraphs.length === 0) ? (
                <div className="card">
                  <div className="empty-state">No pattern data available for the selected data source.</div>
                </div>
              ) : (
                <>
              {patterns.digraphs && patterns.digraphs.length > 0 && (
                <div className="card">
                  <h3>Digraph Statistics</h3>
                  <div className="pattern-overview">
                    <div className="pattern-section">
                      <div className="pattern-subsection">
                        <div className="subsection-title">Fastest Digraphs (Top 5)</div>
                        <div className="pattern-list-compact">
                          {patterns.digraphs.slice(0, 5).map((dg, idx) => (
                            <div 
                              key={idx} 
                              className="pattern-item-compact clickable"
                              onClick={() => handleDigraphClick(dg)}
                              title="Click for details"
                            >
                              <span className="pattern-name">"{dg.pattern}"</span>
                              <span className="pattern-meta">{dg.avg_time}ms avg ({dg.count}x)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="pattern-subsection">
                        <div className="subsection-title">Most Common Digraphs</div>
                        <div className="pattern-list-compact">
                          {[...patterns.digraphs].sort((a, b) => b.count - a.count).slice(0, 5).map((dg, idx) => (
                            <div 
                              key={idx} 
                              className="pattern-item-compact clickable"
                              onClick={() => handleDigraphClick(dg)}
                              title="Click for details"
                            >
                              <span className="pattern-name">"{dg.pattern}"</span>
                              <span className="pattern-meta">{dg.count}x ({dg.avg_time}ms avg)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    {patterns.digraphs.length > 0 && (
                      <div className="recharts-container">
                        <div className="chart-title-inline">Top 10 Fastest Digraphs</div>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart
                            data={patterns.digraphs.slice(0, 10).map(d => ({ name: d.pattern, time: d.avg_time, count: d.count }))}
                            margin={{ top: 10, right: 20, left: 10, bottom: 40 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e0e0e0)" vertical={false} />
                            <XAxis
                              dataKey="name"
                              tick={{ fill: 'var(--text-secondary, #666)', fontSize: 12 }}
                              tickLine={false}
                              axisLine={{ stroke: 'var(--border-color, #ddd)' }}
                              angle={-45}
                              textAnchor="end"
                              height={50}
                            />
                            <YAxis
                              tick={{ fill: 'var(--text-secondary, #666)', fontSize: 11 }}
                              tickLine={false}
                              axisLine={false}
                              label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary, #666)', fontSize: 11 }}
                            />
                            <RechartsTooltip
                              contentStyle={{ background: 'var(--bg-primary, white)', border: '1px solid var(--border-color, #ddd)', borderRadius: '8px' }}
                              formatter={(value, name) => [`${value}ms`, 'Avg Time']}
                              labelFormatter={(label) => `"${label}"`}
                            />
                            <RechartsBar dataKey="time" fill="var(--accent-color, #4A90E2)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                )}
              </div>
            </div>
              )}

              {patterns.trigraphs && patterns.trigraphs.length > 0 && (
                <div className="card">
                  <h3>Trigraph Statistics</h3>
                  <div className="pattern-overview">
                    <div className="pattern-section">
                      <div className="pattern-subsection">
                        <div className="subsection-title">Fastest Trigraphs (Top 5)</div>
                        <div className="pattern-list-compact">
                          {patterns.trigraphs.slice(0, 5).map((tg, idx) => (
                            <div
                              key={idx}
                              className="pattern-item-compact clickable"
                              onClick={() => handleDigraphClick(tg)}
                              title="Click for details"
                            >
                              <span className="pattern-name">"{tg.pattern}"</span>
                              <span className="pattern-meta">{tg.avg_time}ms avg ({tg.count}x)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="pattern-subsection">
                        <div className="subsection-title">Most Common Trigraphs</div>
                        <div className="pattern-list-compact">
                          {[...patterns.trigraphs].sort((a, b) => b.count - a.count).slice(0, 5).map((tg, idx) => (
                            <div
                              key={idx}
                              className="pattern-item-compact clickable"
                              onClick={() => handleDigraphClick(tg)}
                              title="Click for details"
                            >
                              <span className="pattern-name">"{tg.pattern}"</span>
                              <span className="pattern-meta">{tg.count}x ({tg.avg_time}ms avg)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    {patterns.trigraphs.length > 0 && (
                      <div className="recharts-container">
                        <div className="chart-title-inline">Top 10 Fastest Trigraphs</div>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart
                            data={patterns.trigraphs.slice(0, 10).map(t => ({ name: t.pattern, time: t.avg_time, count: t.count }))}
                            margin={{ top: 10, right: 20, left: 10, bottom: 40 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e0e0e0)" vertical={false} />
                            <XAxis
                              dataKey="name"
                              tick={{ fill: 'var(--text-secondary, #666)', fontSize: 12 }}
                              tickLine={false}
                              axisLine={{ stroke: 'var(--border-color, #ddd)' }}
                              angle={-45}
                              textAnchor="end"
                              height={50}
                            />
                            <YAxis
                              tick={{ fill: 'var(--text-secondary, #666)', fontSize: 11 }}
                              tickLine={false}
                              axisLine={false}
                              label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary, #666)', fontSize: 11 }}
                            />
                            <RechartsTooltip
                              contentStyle={{ background: 'var(--bg-primary, white)', border: '1px solid var(--border-color, #ddd)', borderRadius: '8px' }}
                              formatter={(value, name) => [`${value}ms`, 'Avg Time']}
                              labelFormatter={(label) => `"${label}"`}
                            />
                            <RechartsBar dataKey="time" fill="#50C878" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {patterns.fastest_transitions && patterns.fastest_transitions.length > 0 && (
                <div className="card">
                  <h3>Transition Statistics</h3>
                  <div className="pattern-overview">
                    <div className="pattern-section">
                      <div className="pattern-subsection">
                        <div className="subsection-title">Fastest Transitions (Top 5)</div>
                        <div className="pattern-list-compact">
                          {patterns.fastest_transitions.slice(0, 5).map((tr, idx) => (
                            <div key={idx} className="pattern-item-compact">
                              <span className="pattern-name">{tr.pattern}</span>
                              <span className="pattern-meta">{tr.avg_time}ms avg ({tr.count}x)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {patterns.slowest_transitions && patterns.slowest_transitions.length > 0 && (
                        <div className="pattern-subsection">
                          <div className="subsection-title">Slowest Transitions (Top 5)</div>
                          <div className="pattern-list-compact">
                            {patterns.slowest_transitions.slice(0, 5).map((tr, idx) => (
                              <div key={idx} className="pattern-item-compact">
                                <span className="pattern-name">{tr.pattern}</span>
                                <span className="pattern-meta">{tr.avg_time}ms avg ({tr.count}x)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
                </>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'sessions' && (
        <>
          {selectedSession ? (
            <div className="card session-detail-card">
              <div className="session-detail-header">
                <button onClick={() => setSelectedSession(null)} className="back-btn">← Back</button>
                <div className="session-header-info">
                  <span className="session-id-large">#{selectedSession.id}</span>
                  <span className="session-mode-badge">{selectedSession.mode}</span>
                  {selectedSession.label && <span className="session-label-badge">{selectedSession.label}</span>}
                </div>
                <div className="session-header-actions">
                  {editingLabel === selectedSession.id ? (
                    <div className="label-edit-inline">
                      <input
                        type="text"
                        value={labelInput}
                        onChange={(e) => setLabelInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveLabel(selectedSession.id)
                          else if (e.key === 'Escape') { setEditingLabel(null); setLabelInput('') }
                        }}
                        placeholder="Add label..."
                        autoFocus
                      />
                      <button onClick={() => handleSaveLabel(selectedSession.id)}>✓</button>
                      <button onClick={() => { setEditingLabel(null); setLabelInput('') }}>×</button>
                    </div>
                  ) : (
                    <button className="edit-btn" onClick={() => { setEditingLabel(selectedSession.id); setLabelInput(selectedSession.label || '') }}>Edit Label</button>
                  )}
                </div>
              </div>

              {/* Session Meta Grid */}
              <div className="session-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Date</span>
                  <span className="meta-value">{new Date(selectedSession.timestamp * 1000).toLocaleString()}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Keystrokes</span>
                  <span className="meta-value">{selectedSession.keystrokes?.length || 0}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Characters</span>
                  <span className="meta-value">{selectedSession.raw_text?.length || 0}</span>
                </div>
              </div>

              {/* Text Preview */}
              <div className="session-text-section">
                <h4>Typed Text</h4>
                <pre className="text-content">{selectedSession.raw_text}</pre>
              </div>
                {selectedSession.keystrokes && selectedSession.keystrokes.length > 0 && (
                  <div className="keystroke-list">
                    <div className="keystroke-list-header">
                      <h4>Keystrokes</h4>
                      <button 
                        onClick={() => setEditingKeystrokes(!editingKeystrokes)}
                        className="edit-keystrokes-button"
                      >
                        {editingKeystrokes ? 'Done Editing' : 'Edit Keystrokes'}
                      </button>
                    </div>
                    
                    {/* Deletion feedback */}
                    {deletionFeedback && (
                      <div className="deletion-feedback">
                        {deletionFeedback.message}
                      </div>
                    )}
                    
                    {/* Keystroke timing graph */}
                    <div className="keystroke-graph-container">
                      <div style={{ height: '200px', marginBottom: '1rem' }}>
                        {(() => {
                          const displayKeystrokes = getDisplayKeystrokes()
                          const colors = getChartColors()
                          return (
                        <Bar
                          data={{
                                labels: displayKeystrokes.map((_, i) => i),
                            datasets: [{
                              label: 'Duration (ms)',
                              data: displayKeystrokes.map((ks, i) => {
                                if (i === 0) return 0
                                const prev = displayKeystrokes[i-1]
                                // Check for breakpoint (prev_key is null or doesn't match previous key)
                                if (ks.prev_key === null || ks.prev_key !== prev.key) {
                                  return null // Create gap in chart for breakpoint
                                }
                                return (ks.timestamp - prev.timestamp) || 0
                              }),
                              backgroundColor: displayKeystrokes.map((_, i) => {
                                if (i === 0) return selectedKeystrokeIndex === i ? colors.error : colors.accent
                                const ks = displayKeystrokes[i]
                                const prev = displayKeystrokes[i-1]
                                // Show breakpoint color (red tint) for discontinuities
                                if (ks.prev_key === null || ks.prev_key !== prev.key) {
                                  return colors.error + '80' // Semi-transparent red for breakpoints
                                }
                                return selectedKeystrokeIndex === i ? colors.error : colors.accent
                              }),
                              borderColor: displayKeystrokes.map((_, i) => {
                                if (i === 0) return 'transparent'
                                const ks = displayKeystrokes[i]
                                const prev = displayKeystrokes[i-1]
                                // Show breakpoint border (red) for discontinuities
                                if (ks.prev_key === null || ks.prev_key !== prev.key) {
                                  return colors.error // Red border for breakpoints
                                }
                                return 'transparent'
                              }),
                              borderWidth: displayKeystrokes.map((_, i) => {
                                if (i === 0) return 0
                                const ks = displayKeystrokes[i]
                                const prev = displayKeystrokes[i-1]
                                // Show breakpoint border
                                if (ks.prev_key === null || ks.prev_key !== prev.key) {
                                  return 2 // Thick border for breakpoints
                                }
                                return 0
                              })
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            onClick: async (event, elements) => {
                              if (elements.length > 0 && editingKeystrokes) {
                                const idx = elements[0].index
                                    const displayKeystrokes = getDisplayKeystrokes()
                                    const ks = displayKeystrokes[idx]
                                
                                if (!ks || !ks.id) {
                                  alert('Cannot delete keystroke: no ID available')
                                  return
                                }
                                
                                    const keyDisplay = ks.key === ' ' ? 'SPACE' : ks.key
                                    if (confirm(`Delete keystroke "${keyDisplay}"? This will create a breakpoint in the timing data.`)) {
                                  try {
                                        // Delete from backend
                                    const response = await fetch(`/api/keystroke/${ks.id}`, {
                                      method: 'DELETE'
                                    })
                                    
                                    if (response.ok) {
                                          // Show feedback
                                          setDeletionFeedback({
                                            message: `Deleted keystroke "${keyDisplay}" at index ${idx}. Breakpoint created.`,
                                            timestamp: Date.now()
                                          })
                                          
                                          // Clear feedback after 3 seconds
                                          setTimeout(() => setDeletionFeedback(null), 3000)
                                          
                                          // Reload session to get updated data from backend (with breakpoint)
                                      await handleSessionClick(selectedSession.id)
                                      setSelectedKeystrokeIndex(null)
                                    } else {
                                      alert('Failed to delete keystroke')
                                    }
                                  } catch (err) {
                                    console.error('Failed to delete keystroke:', err)
                                    alert('Failed to delete keystroke')
                                  }
                                }
                              } else if (elements.length > 0) {
                                // If not editing, just select for viewing
                                setSelectedKeystrokeIndex(elements[0].index)
                              }
                            },
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                callbacks: {
                                  label: (context) => {
                                      const displayKeystrokes = getDisplayKeystrokes()
                                    const idx = context.dataIndex
                                      const ks = displayKeystrokes[idx]
                                      
                                      if (context.parsed.y === null) {
                                    return [
                                          'BREAKPOINT',
                                      `Key: "${ks.key === ' ' ? 'SPACE' : ks.key}"`,
                                          'Previous keystroke was deleted'
                                        ]
                                      }
                                      
                                      return [
                                        `Duration: ${context.parsed.y?.toFixed(2) || 0}ms`,
                                        `Key: "${ks.key === ' ' ? 'SPACE' : ks.key}"`,
                                        idx > 0 ? `From: "${displayKeystrokes[idx-1].key === ' ' ? 'SPACE' : displayKeystrokes[idx-1].key}"` : 'Start'
                                    ]
                                  }
                                }
                              }
                            },
                            scales: {
                              y: { 
                                    ticks: { color: colors.textSub }, 
                                    grid: { color: colors.grid },
                                    title: { display: true, text: 'Duration (ms)', color: colors.text }
                              },
                              x: { 
                                    ticks: { color: colors.textSub }, 
                                    grid: { color: colors.grid },
                                    title: { display: true, text: 'Keystroke Index', color: colors.text }
                              }
                            }
                          }}
                        />
                          )
                        })()}
                      </div>
                      
                      {/* Crop controls */}
                      {localKeystrokes && localKeystrokes.length > 0 && (
                        <div className="crop-controls">
                          <div className="crop-input-group">
                            <label>Crop Start:</label>
                            <input
                              type="number"
                              min="0"
                              max={localKeystrokes.length - 1}
                              value={cropStart}
                              onChange={(e) => setCropStart(Math.max(0, Math.min(parseInt(e.target.value) || 0, cropEnd !== null ? cropEnd : localKeystrokes.length - 1)))}
                            />
                          </div>
                          <div className="crop-input-group">
                            <label>Crop End:</label>
                            <input
                              type="number"
                              min={cropStart}
                              max={localKeystrokes.length - 1}
                              value={cropEnd !== null ? cropEnd : localKeystrokes.length - 1}
                              onChange={(e) => {
                                const maxIndex = localKeystrokes.length - 1
                                const value = parseInt(e.target.value) || 0
                                setCropEnd(Math.max(cropStart, Math.min(value, maxIndex)))
                              }}
                            />
                          </div>
                          <button onClick={handleApplyCrop} className="crop-button">
                            Apply Crop
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {selectedKeystrokeIndex !== null && editingKeystrokes && (() => {
                      const displayKeystrokes = getDisplayKeystrokes()
                      const ks = displayKeystrokes[selectedKeystrokeIndex]
                      if (!ks) return null
                      return (
                      <div className="keystroke-edit-panel">
                        <div className="edit-panel-header">
                          <strong>Editing Keystroke #{selectedKeystrokeIndex}</strong>
                          <button 
                            onClick={async () => {
                              if (!ks.id) return
                              
                              const keyDisplay = ks.key === ' ' ? 'SPACE' : ks.key
                              if (confirm(`Delete keystroke "${keyDisplay}"? This will create a breakpoint in the timing data.`)) {
                                try {
                                  const response = await fetch(`/api/keystroke/${ks.id}`, {
                                    method: 'DELETE'
                                  })
                                  
                                  if (response.ok) {
                                    // Show feedback
                                    setDeletionFeedback({
                                      message: `Deleted keystroke "${keyDisplay}" at index ${selectedKeystrokeIndex}. Breakpoint created.`,
                                      timestamp: Date.now()
                                    })
                                    
                                    // Clear feedback after 3 seconds
                                    setTimeout(() => setDeletionFeedback(null), 3000)
                                    
                                    // Reload session to get updated data from backend (with breakpoint)
                                    await handleSessionClick(selectedSession.id)
                                    setSelectedKeystrokeIndex(null)
                                  }
                                } catch (err) {
                                  console.error('Failed to delete keystroke:', err)
                                  alert('Failed to delete keystroke')
                                }
                              }
                            }}
                            className="delete-keystroke-button"
                          >
                              Delete
                          </button>
                        </div>
                        <div className="edit-panel-details">
                            <div>Key: "{ks.key === ' ' ? 'SPACE' : ks.key}"</div>
                            {ks.prev_key && (
                              <div>From: "{ks.prev_key === ' ' ? 'SPACE' : ks.prev_key}"</div>
                          )}
                          <div>Duration: {selectedKeystrokeIndex > 0 ? 
                              (displayKeystrokes[selectedKeystrokeIndex].timestamp - displayKeystrokes[selectedKeystrokeIndex - 1].timestamp).toFixed(2) 
                            : 0}ms</div>
                        </div>
                      </div>
                      )
                    })()}
                    
                    <div className="keystroke-items">
                      {getDisplayKeystrokes().map((ks, idx) => {
                        const displayKeystrokes = getDisplayKeystrokes()
                        const hasBreakpoint = ks.prev_key === null || (idx > 0 && ks.prev_key !== displayKeystrokes[idx-1].key)
                        return (
                        <div 
                          key={ks.id || idx} 
                            className={`keystroke-item ${editingKeystrokes && selectedKeystrokeIndex === idx ? 'selected' : ''} ${hasBreakpoint ? 'has-breakpoint' : ''}`}
                          onClick={() => editingKeystrokes && setSelectedKeystrokeIndex(idx)}
                        >
                          <span className="ks-key">"{ks.key === ' ' ? 'SPACE' : ks.key}"</span>
                          {ks.prev_key && <span className="ks-transition">← "{ks.prev_key === ' ' ? 'SPACE' : ks.prev_key}"</span>}
                            {hasBreakpoint && <span className="ks-break">[BREAKPOINT]</span>}
                          {ks.finger && <span className="ks-finger">{ks.finger}</span>}
                          {idx > 0 && (
                            <span className="ks-duration">
                                {(ks.timestamp - displayKeystrokes[idx-1].timestamp).toFixed(2)}ms
                            </span>
                          )}
                        </div>
                        )
                      })}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="card sessions-list-card">
              <div className="sessions-list-header">
                <h3>Sessions</h3>
                <div className="sessions-filters">
                  <select
                    value={sessionModeFilter}
                    onChange={(e) => setSessionModeFilter(e.target.value)}
                    className="mode-select"
                  >
                    <option value="all">All Modes</option>
                    {[...new Set(sessions.map(s => s.mode))].sort().map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                  <span className="session-count">
                    {sessionModeFilter === 'all' ? sessions.length : sessions.filter(s => s.mode === sessionModeFilter).length} sessions
                  </span>
                </div>
              </div>

              {sessions.length === 0 ? (
                <p className="empty-state">No sessions found</p>
              ) : (
                <div className="sessions-table">
                  <div className="sessions-table-header">
                    <span className="col-id">ID</span>
                    <span className="col-mode">Mode</span>
                    <span className="col-text">Text Preview</span>
                    <span className="col-date">Date</span>
                    <span className="col-actions"></span>
                  </div>
                  <div className="sessions-table-body">
                    {(sessionModeFilter === 'all' ? sessions : sessions.filter(s => s.mode === sessionModeFilter)).map(session => (
                      <div key={session.id} className="session-row" onClick={() => handleSessionClick(session.id)}>
                        <span className="col-id">
                          <span className="session-num">#{session.id}</span>
                          {session.label && <span className="session-tag">{session.label}</span>}
                        </span>
                        <span className="col-mode">
                          <span className="mode-badge">{session.mode}</span>
                        </span>
                        <span className="col-text">{session.raw_text?.substring(0, 40)}...</span>
                        <span className="col-date">{new Date(session.timestamp * 1000).toLocaleDateString()}</span>
                        <span className="col-actions" onClick={(e) => e.stopPropagation()}>
                          <button className="action-btn" onClick={(e) => { e.stopPropagation(); setEditingLabel(session.id); setLabelInput(session.label || '') }} title="Edit label">✎</button>
                          <button className="action-btn delete" onClick={(e) => handleDeleteSession(session.id, e)} title="Delete">×</button>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'database' && (
        <div className="card">
          <h3>Database Management</h3>
          <div className="database-actions">
            <div className="db-action-item">
              <h4>Download Database</h4>
              <p>Export your current database as a SQLite file</p>
              <button 
                onClick={async () => {
                  try {
                    const response = await fetch('/api/database/download')
                    if (response.ok) {
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      const now = new Date()
                      const dateStr = now.toISOString().split('T')[0]
                      const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`
                      a.download = `typing_data_${dateStr}_${timeStr}.db`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      window.URL.revokeObjectURL(url)
                    }
                  } catch (err) {
                    console.error('Failed to download database:', err)
                    alert('Failed to download database')
                  }
                }}
                className="db-button"
              >
                Download Database
              </button>
            </div>
            <div className="db-action-item">
              <h4>Upload Database</h4>
              <p>Import a database file (will replace current database)</p>
              <input
                type="file"
                accept=".db"
                id="db-upload-input"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files[0]
                  if (!file) return
                  
                  if (!confirm('This will replace your current database. Are you sure?')) {
                    e.target.value = ''
                    return
                  }
                  
                  const formData = new FormData()
                  formData.append('file', file)
                  
                  try {
                    const response = await fetch('/api/database/upload', {
                      method: 'POST',
                      body: formData
                    })
                    
                    if (response.ok) {
                      alert('Database uploaded successfully!')
                      await loadData(true)
                    } else {
                      alert('Failed to upload database')
                    }
                  } catch (err) {
                    console.error('Failed to upload database:', err)
                    alert('Failed to upload database')
                  }
                  
                  e.target.value = ''
                }}
              />
              <button 
                onClick={() => document.getElementById('db-upload-input').click()}
                className="db-button"
              >
                Upload Database
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'patterns' && (
        <PatternsTab />
      )}

      {activeTab === 'data' && (
        <DataViewerTab />
      )}

      {activeTab === 'coverage' && (
        <CoverageTab />
      )}

      {activeTab === 'deviations' && (
        <DeviationTab />
      )}

      {/* Pattern Detail Modal - accessible from any tab */}
      {showDigraphModal && selectedDigraph && (
        <div className="modal-overlay" onClick={() => { setShowDigraphModal(false); setSelectedDigraph(null) }}>
          <div className="modal-content pattern-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pattern-modal-header">
              <div className="pattern-title">
                <span className="pattern-text-large">{selectedDigraph.pattern}</span>
                <span className="pattern-type">{selectedDigraph.pattern.length === 2 ? 'Digraph' : 'Trigraph'}</span>
              </div>
              <button onClick={() => { setShowDigraphModal(false); setSelectedDigraph(null) }} className="close-modal">×</button>
            </div>

            {/* Stats Row */}
            <div className="pattern-stats-row">
              <div className="pattern-stat primary">
                <span className="stat-number">{selectedDigraph.avg_time}</span>
                <span className="stat-unit">ms avg</span>
              </div>
              <div className="pattern-stat">
                <span className="stat-number">{selectedDigraph.count}</span>
                <span className="stat-unit">samples</span>
              </div>
              <div className="pattern-stat">
                <span className="stat-number">{selectedDigraph.min_time}</span>
                <span className="stat-unit">ms min</span>
              </div>
              <div className="pattern-stat">
                <span className="stat-number">{selectedDigraph.max_time}</span>
                <span className="stat-unit">ms max</span>
              </div>
              {selectedDigraph.details?.std_dev && (
                <div className="pattern-stat">
                  <span className="stat-number">{selectedDigraph.details.std_dev}</span>
                  <span className="stat-unit">std dev</span>
                </div>
              )}
            </div>

            {/* Distribution Chart - Histogram with Outlier Highlighting */}
            {selectedDigraph.details?.distribution && (() => {
              const labels = selectedDigraph.details.distribution.labels || []
              const values = selectedDigraph.details.distribution.values || []
              const thresholdLow = selectedDigraph.details.threshold_low
              const thresholdHigh = selectedDigraph.details.threshold_high
              const mean = selectedDigraph.avg_time

              // Create chart data with outlier marking
              const chartData = labels.map((label, i) => {
                const timeValue = parseFloat(label)
                const isOutlier = (thresholdLow !== undefined && thresholdLow !== null && timeValue < thresholdLow) ||
                                  (thresholdHigh !== undefined && thresholdHigh !== null && timeValue > thresholdHigh)
                return {
                  time: label,
                  count: values[i] || 0,
                  isOutlier,
                  fill: isOutlier ? '#f44336' : '#4A90E2'
                }
              })

              return (
                <div className="pattern-section">
                  <h4>Time Distribution</h4>
                  <div className="distribution-legend">
                    <span className="legend-item"><span className="dot normal"></span>Normal</span>
                    <span className="legend-item"><span className="dot outlier"></span>Outlier</span>
                    {thresholdLow !== undefined && thresholdLow !== null && (
                      <span className="legend-item threshold">Low: {thresholdLow}ms</span>
                    )}
                    {thresholdHigh !== undefined && thresholdHigh !== null && (
                      <span className="legend-item threshold">High: {thresholdHigh}ms</span>
                    )}
                  </div>
                  <div className="distribution-chart">
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                        <XAxis
                          dataKey="time"
                          tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
                          tickLine={false}
                          axisLine={{ stroke: 'var(--border-light)' }}
                          interval="preserveStartEnd"
                          angle={-45}
                          textAnchor="end"
                          height={40}
                        />
                        <YAxis
                          tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          width={30}
                        />
                        <RechartsTooltip
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '12px' }}
                          formatter={(value, name, props) => {
                            const status = props.payload.isOutlier ? ' (outlier)' : ''
                            return [`${value} samples${status}`, 'Count']
                          }}
                          labelFormatter={(label) => `${label}ms`}
                        />
                        {mean && (
                          <ReferenceLine x={String(Math.round(mean))} stroke="#4A90E2" strokeDasharray="5 5" label={{ value: 'avg', fill: '#4A90E2', fontSize: 10 }} />
                        )}
                        <RechartsBar dataKey="count" radius={[2, 2, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </RechartsBar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            })()}

            {/* Words Containing Pattern */}
            {selectedDigraph.details?.words && selectedDigraph.details.words.length > 0 && (
              <div className="pattern-section">
                <h4>Words Containing "{selectedDigraph.pattern}"</h4>
                <div className="pattern-words-grid">
                  {selectedDigraph.details.words.map((word, idx) => {
                    const pattern = selectedDigraph.pattern.replace(/"/g, '').toLowerCase()
                    const wordLower = word.toLowerCase()
                    const patternIndex = wordLower.indexOf(pattern)

                    if (patternIndex === -1) {
                      return <span key={idx} className="word-chip">{word}</span>
                    }

                    return (
                      <span key={idx} className="word-chip">
                        {word.substring(0, patternIndex)}
                        <mark>{word.substring(patternIndex, patternIndex + pattern.length)}</mark>
                        {word.substring(patternIndex + pattern.length)}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Session Breakdown */}
            {selectedDigraph.details?.session_breakdown && selectedDigraph.details.session_breakdown.length > 0 && (
              <div className="pattern-section">
                <h4>By Session</h4>
                <div className="session-breakdown">
                  {selectedDigraph.details.session_breakdown.slice(0, 5).map((session, idx) => (
                    <div key={idx} className="session-breakdown-item">
                      <span className="session-id">#{session.session_id}</span>
                      <span className="session-time">{session.avg_time}ms</span>
                      <span className="session-count">{session.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outlier Info */}
            {selectedDigraph.excluded_count > 0 && (
              <div className="pattern-section outlier-info">
                <span className="outlier-badge">{selectedDigraph.excluded_count} outliers excluded</span>
                {selectedDigraph.raw_avg_time && (
                  <span className="raw-avg">Raw avg: {selectedDigraph.raw_avg_time}ms</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default StatsView


