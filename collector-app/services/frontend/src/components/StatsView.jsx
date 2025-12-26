import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import './StatsView.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

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

  useEffect(() => {
    if (activeTab === 'patterns' && !patterns) {
      // Don't auto-load patterns, wait for recalculate button
    }
  }, [activeTab])

  const loadData = async (loadPatterns = false) => {
    try {
      const promises = [
        fetch('/api/sessions'),
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
      }
      
      if (loadPatterns && patternsRes && patternsRes.ok) {
        const patternsData = await patternsRes.json()
        setPatterns(patternsData)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const recalculatePatterns = async () => {
    setCalculatingPatterns(true)
    try {
      const response = await fetch('/api/patterns')
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
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
      alert('Failed to delete session')
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

  if (loading && activeTab !== 'patterns') {
    return (
      <div className="stats-view">
        <div className="card">
          <div className="loading">Loading stats...</div>
        </div>
      </div>
    )
  }

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
      </div>

      {activeTab === 'overview' && stats && (
        <div className="card">
          <div className="overview-grid">
            <div className="overview-stat">
              <div className="stat-value">{stats.total_sessions || 0}</div>
              <div className="stat-label">Sessions</div>
            </div>
            <div className="overview-stat">
              <div className="stat-value">{(stats.total_keystrokes || 0).toLocaleString()}</div>
              <div className="stat-label">Keystrokes</div>
            </div>
            <div className="overview-stat">
              <div className="stat-value">{(stats.total_characters || 0).toLocaleString()}</div>
              <div className="stat-label">Characters</div>
            </div>
            {stats.sessions_by_mode && Object.keys(stats.sessions_by_mode).length > 0 && (
              <div className="overview-modes">
                <div className="modes-label">Sessions by Mode:</div>
                <div className="modes-list">
                  {Object.entries(stats.sessions_by_mode).map(([mode, count]) => (
                    <div key={mode} className="mode-item">
                      <span className="mode-name">{mode}</span>
                      <span className="mode-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <>
          {selectedSession ? (
            <div className="card">
              <div className="session-detail-header">
                <h3>Session #{selectedSession.id} Details</h3>
                <button onClick={() => setSelectedSession(null)} className="back-button">← Back</button>
              </div>
              <div className="session-details">
                <div className="detail-row">
                  <span className="detail-label">Mode:</span>
                  <span className="detail-value">{selectedSession.mode}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{new Date(selectedSession.timestamp * 1000).toLocaleString()}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Keystrokes:</span>
                  <span className="detail-value">{selectedSession.keystrokes?.length || 0}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Text:</span>
                  <span className="detail-value text-preview">{selectedSession.raw_text}</span>
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
            </div>
          ) : (
            <div className="card">
              <h3>Recent Sessions</h3>
              <div className="sessions-list">
                {sessions.length === 0 ? (
                  <p className="empty-state">No sessions found</p>
                ) : (
                  sessions.map(session => (
                    <div 
                      key={session.id} 
                      className="session-item clickable"
                      onClick={() => handleSessionClick(session.id)}
                    >
                      <div className="session-info">
                        <div className="session-id">Session #{session.id}</div>
                        <div className="session-mode">{session.mode}</div>
                        <div className="session-date">
                          {new Date(session.timestamp * 1000).toLocaleString()}
                        </div>
                        <button 
                          className="delete-session-button"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          title="Delete session"
                        >
                          ×
                        </button>
                      </div>
                      <div className="session-text-preview">
                        {session.raw_text?.substring(0, 50)}...
                      </div>
                    </div>
                  ))
                )}
              </div>
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
        <>
          {calculatingPatterns ? (
            <div className="card">
              <div className="loading">Calculating patterns...</div>
            </div>
          ) : patterns ? (
            <div className="patterns-grid">
              <div className="card pattern-card">
                <div className="pattern-header">
                  <h3>Fastest Digraphs (Two-Letter Patterns)</h3>
                  <button 
                    onClick={recalculatePatterns} 
                    className="recalculate-button"
                    disabled={calculatingPatterns}
                  >
                    {calculatingPatterns ? 'Calculating...' : 'Recalculate'}
                  </button>
                </div>
                <div className="pattern-list">
                  {patterns.digraphs.length === 0 ? (
                    <p className="empty-state">No digraph data available</p>
                  ) : (
                    patterns.digraphs.map((dg, idx) => (
                      <div 
                        key={idx} 
                        className="pattern-item clickable"
                        onClick={() => handleDigraphClick(dg)}
                      >
                        <span className="pattern-name">"{dg.pattern}"</span>
                        <span className="pattern-stats">
                          Avg: {dg.avg_time}ms | Count: {dg.count} | Range: {dg.min_time}-{dg.max_time}ms
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Digraph Modal */}
              {showDigraphModal && selectedDigraph && (
                <div className="modal-overlay" onClick={() => { setShowDigraphModal(false); setSelectedDigraph(null) }}>
                  <div className="modal-content digraph-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="digraph-detail-header">
                      <h3>Digraph Details: "{selectedDigraph.pattern}"</h3>
                      <button onClick={() => { setShowDigraphModal(false); setSelectedDigraph(null) }} className="close-info">×</button>
                    </div>
                  <div className="digraph-stats-compact">
                    <div className="stat-item">
                      <span className="stat-label">Avg:</span>
                      <span className="stat-value">{selectedDigraph.avg_time}ms</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Count:</span>
                      <span className="stat-value">{selectedDigraph.count}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Range:</span>
                      <span className="stat-value">{selectedDigraph.min_time}-{selectedDigraph.max_time}ms</span>
                    </div>
                  </div>
                  {selectedDigraph.details && (
                    <>
                      {selectedDigraph.details.words && selectedDigraph.details.words.length > 0 && (
                        <div className="digraph-words">
                          <h4>Words Containing This Digraph</h4>
                          <div className="words-list">
                            {selectedDigraph.details.words.map((word, idx) => {
                              const pattern = selectedDigraph.pattern.replace(/"/g, '').toLowerCase()
                              const wordLower = word.toLowerCase()
                              const patternIndex = wordLower.indexOf(pattern)
                              
                              if (patternIndex === -1) {
                                return <span key={idx} className="word-tag">{word}</span>
                              }
                              
                              return (
                                <span key={idx} className="word-tag">
                                  {word.substring(0, patternIndex)}
                                  <span className="highlighted-digraph">{word.substring(patternIndex, patternIndex + pattern.length)}</span>
                                  {word.substring(patternIndex + pattern.length)}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {selectedDigraph.details.distribution && (
                        <div className="digraph-distribution">
                          <h4>Time Distribution</h4>
                          <div style={{ height: '200px', marginTop: '1rem' }}>
                            <Bar
                              data={{
                                labels: selectedDigraph.details.distribution.labels || [],
                                datasets: [{
                                  label: 'Frequency',
                                  data: selectedDigraph.details.distribution.values || [],
                                  backgroundColor: '#4A90E2'
                                }]
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: { display: false },
                                  title: { display: false }
                                },
                                scales: {
                                  y: { 
                                    ticks: { color: getChartColors().textSub }, 
                                    grid: { color: getChartColors().grid },
                                    title: { display: true, text: 'Frequency', color: getChartColors().text }
                                  },
                                  x: { 
                                    ticks: { 
                                      color: getChartColors().textSub,
                                      maxRotation: 45,
                                      minRotation: 45
                                    }, 
                                    grid: { color: getChartColors().grid },
                                    title: { display: true, text: 'Time (ms)', color: getChartColors().text }
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                      </>
                    )}
                  </div>
                </div>
              )}
              
              <div className="card pattern-card">
                <h3>Fastest Trigraphs</h3>
                <div className="pattern-list">
                  {patterns.trigraphs.length === 0 ? (
                    <p className="empty-state">No trigraph data available</p>
                  ) : (
                    patterns.trigraphs.map((tg, idx) => (
                      <div key={idx} className="pattern-item">
                        <span className="pattern-name">"{tg.pattern}"</span>
                        <span className="pattern-stats">
                          Avg: {tg.avg_time}ms | Count: {tg.count} | Range: {tg.min_time}-{tg.max_time}ms
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <div className="card pattern-card">
                <h3>Fastest Transitions</h3>
                <div className="pattern-list">
                  {patterns.fastest_transitions.length === 0 ? (
                    <p className="empty-state">No transition data available</p>
                  ) : (
                    patterns.fastest_transitions.map((tr, idx) => (
                      <div key={idx} className="pattern-item">
                        <span className="pattern-name">{tr.pattern}</span>
                        <span className="pattern-stats">
                          Avg: {tr.avg_time}ms | Count: {tr.count} | Range: {tr.min_time}-{tr.max_time}ms
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <div className="card pattern-card">
                <h3>Slowest Transitions</h3>
                <div className="pattern-list">
                  {patterns.slowest_transitions.length === 0 ? (
                    <p className="empty-state">No transition data available</p>
                  ) : (
                    patterns.slowest_transitions.map((tr, idx) => (
                      <div key={idx} className="pattern-item">
                        <span className="pattern-name">{tr.pattern}</span>
                        <span className="pattern-stats">
                          Avg: {tr.avg_time}ms | Count: {tr.count} | Range: {tr.min_time}-{tr.max_time}ms
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="pattern-header">
                <h3>Pattern Analysis</h3>
                <button 
                  onClick={recalculatePatterns} 
                  className="recalculate-button"
                  disabled={calculatingPatterns}
                >
                  {calculatingPatterns ? 'Calculating...' : 'Calculate Patterns'}
                </button>
              </div>
              <p className="empty-state" style={{ marginTop: '1rem' }}>
                Click "Calculate Patterns" to analyze your typing data for digraphs, trigraphs, and transitions.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default StatsView

