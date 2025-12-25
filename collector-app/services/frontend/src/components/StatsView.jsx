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
      }
    } catch (err) {
      console.error('Failed to load session:', err)
    }
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
        <h2>Statistics & Database</h2>
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
        <>
          <div className="card">
            <h3>Database Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
              <div style={{ height: '300px' }}>
                <Bar
                  data={{
                    labels: ['Sessions', 'Keystrokes', 'Characters'],
                    datasets: [{
                      label: 'Count',
                      data: [
                        stats.total_sessions || 0,
                        Math.floor((stats.total_keystrokes || 0) / 100),
                        Math.floor((stats.total_characters || 0) / 1000)
                      ],
                      backgroundColor: ['#94a3b8', '#8b5cf6', '#14b8a6']
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      title: { display: true, text: 'Database Statistics', color: '#e2e8f0' }
                    },
                    scales: {
                      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.2)' } },
                      x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.2)' } }
                    }
                  }}
                />
              </div>
              <div style={{ height: '300px' }}>
                {stats.sessions_by_mode && (
                  <Doughnut
                    data={{
                      labels: Object.keys(stats.sessions_by_mode),
                      datasets: [{
                        data: Object.values(stats.sessions_by_mode),
                        backgroundColor: ['#94a3b8', '#8b5cf6', '#14b8a6', '#ef4444', '#22c55e']
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { labels: { color: '#e2e8f0' } },
                        title: { display: true, text: 'Sessions by Mode', color: '#e2e8f0' }
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </>
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
                    
                    {/* Keystroke timing graph */}
                    <div className="keystroke-graph-container">
                      <div style={{ height: '200px', marginBottom: '1rem' }}>
                        <Bar
                          data={{
                            labels: selectedSession.keystrokes.map((_, i) => i),
                            datasets: [{
                              label: 'Duration (ms)',
                              data: selectedSession.keystrokes.map((ks, i) => {
                                if (i === 0) return 0
                                return (ks.timestamp - selectedSession.keystrokes[i-1].timestamp) || 0
                              }),
                              backgroundColor: selectedSession.keystrokes.map((_, i) => 
                                selectedKeystrokeIndex === i ? '#ef4444' : '#94a3b8'
                              )
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            onClick: async (event, elements) => {
                              if (elements.length > 0 && editingKeystrokes) {
                                const idx = elements[0].index
                                const ks = selectedSession.keystrokes[idx]
                                
                                if (!ks || !ks.id) {
                                  alert('Cannot delete keystroke: no ID available')
                                  return
                                }
                                
                                if (confirm(`Delete keystroke "${ks.key === ' ' ? 'SPACE' : ks.key}"? This will cascade to all pattern calculations.`)) {
                                  try {
                                    const response = await fetch(`/api/keystroke/${ks.id}`, {
                                      method: 'DELETE'
                                    })
                                    
                                    if (response.ok) {
                                      // Reload session to update graph
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
                                    const idx = context.dataIndex
                                    const ks = selectedSession.keystrokes[idx]
                                    return [
                                      `Duration: ${context.parsed.y.toFixed(2)}ms`,
                                      `Key: "${ks.key === ' ' ? 'SPACE' : ks.key}"`,
                                      idx > 0 ? `From: "${selectedSession.keystrokes[idx-1].key === ' ' ? 'SPACE' : selectedSession.keystrokes[idx-1].key}"` : 'Start'
                                    ]
                                  }
                                }
                              }
                            },
                            scales: {
                              y: { 
                                ticks: { color: '#94a3b8' }, 
                                grid: { color: 'rgba(148, 163, 184, 0.2)' },
                                title: { display: true, text: 'Duration (ms)', color: '#e2e8f0' }
                              },
                              x: { 
                                ticks: { color: '#94a3b8' }, 
                                grid: { color: 'rgba(148, 163, 184, 0.2)' },
                                title: { display: true, text: 'Keystroke Index', color: '#e2e8f0' }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    {selectedKeystrokeIndex !== null && editingKeystrokes && (
                      <div className="keystroke-edit-panel">
                        <div className="edit-panel-header">
                          <strong>Editing Keystroke #{selectedKeystrokeIndex}</strong>
                          <button 
                            onClick={async () => {
                              const ks = selectedSession.keystrokes[selectedKeystrokeIndex]
                              if (!ks.id) return
                              
                              if (confirm('Delete this keystroke? This will cascade to all pattern calculations.')) {
                                try {
                                  const response = await fetch(`/api/keystroke/${ks.id}`, {
                                    method: 'DELETE'
                                  })
                                  
                                  if (response.ok) {
                                    // Reload session
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
                            🗑️ Delete
                          </button>
                        </div>
                        <div className="edit-panel-details">
                          <div>Key: "{selectedSession.keystrokes[selectedKeystrokeIndex].key === ' ' ? 'SPACE' : selectedSession.keystrokes[selectedKeystrokeIndex].key}"</div>
                          {selectedSession.keystrokes[selectedKeystrokeIndex].prev_key && (
                            <div>From: "{selectedSession.keystrokes[selectedKeystrokeIndex].prev_key === ' ' ? 'SPACE' : selectedSession.keystrokes[selectedKeystrokeIndex].prev_key}"</div>
                          )}
                          <div>Duration: {selectedKeystrokeIndex > 0 ? 
                            (selectedSession.keystrokes[selectedKeystrokeIndex].timestamp - selectedSession.keystrokes[selectedKeystrokeIndex - 1].timestamp).toFixed(2) 
                            : 0}ms</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="keystroke-items">
                      {selectedSession.keystrokes.map((ks, idx) => (
                        <div 
                          key={ks.id || idx} 
                          className={`keystroke-item ${editingKeystrokes && selectedKeystrokeIndex === idx ? 'selected' : ''}`}
                          onClick={() => editingKeystrokes && setSelectedKeystrokeIndex(idx)}
                        >
                          <span className="ks-key">"{ks.key === ' ' ? 'SPACE' : ks.key}"</span>
                          {ks.prev_key && <span className="ks-transition">← "{ks.prev_key === ' ' ? 'SPACE' : ks.prev_key}"</span>}
                          {ks.finger && <span className="ks-finger">{ks.finger}</span>}
                          {idx > 0 && (
                            <span className="ks-duration">
                              {(ks.timestamp - selectedSession.keystrokes[idx-1].timestamp).toFixed(2)}ms
                            </span>
                          )}
                        </div>
                      ))}
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
                          🗑️
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
                      a.download = `typing_data_${new Date().toISOString().split('T')[0]}.db`
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
                📥 Download Database
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
                📤 Upload Database
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
                  <div className="digraph-stats">
                    <div className="stat-row">
                      <span>Average Time:</span>
                      <strong>{selectedDigraph.avg_time}ms</strong>
                    </div>
                    <div className="stat-row">
                      <span>Occurrences:</span>
                      <strong>{selectedDigraph.count}</strong>
                    </div>
                    <div className="stat-row">
                      <span>Time Range:</span>
                      <strong>{selectedDigraph.min_time}ms - {selectedDigraph.max_time}ms</strong>
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
                                  backgroundColor: '#94a3b8'
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
                                  y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.2)' } },
                                  x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.2)' } }
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

