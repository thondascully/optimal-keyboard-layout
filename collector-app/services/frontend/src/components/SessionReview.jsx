import { useMemo, useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)
import { getDefaultFinger, getDefaultHand } from '../utils/fingerMapping'
import { AMBIGUOUS_KEYS, FINGER_OPTIONS } from '../utils/constants'
import './SessionReview.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

function SessionReview({ sessionData, onStartNew }) {
  const [fingerAnnotations, setFingerAnnotations] = useState({})
  const [annotationStatus, setAnnotationStatus] = useState(null)
  const [cropStart, setCropStart] = useState(0)
  const [cropEnd, setCropEnd] = useState(null)
  const [localKeystrokes, setLocalKeystrokes] = useState(null)
  const [error, setError] = useState(null)

  // Show error if one occurred
  if (error) {
    return (
      <div className="session-review fade-in">
        <div className="card">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={onStartNew}>Start New Session</button>
        </div>
      </div>
    )
  }

  // Initialize local keystrokes and crop settings
  useEffect(() => {
    if (!sessionData) {
      setLocalKeystrokes([]) // Set empty to prevent infinite loading
      return
    }

    const sessionId = sessionData.session_id || sessionData.id

    if (sessionData.keystrokes && sessionData.keystrokes.length > 0) {
      // Check if keystrokes have IDs
      const keystrokesWithIds = [...sessionData.keystrokes]
      const missingIds = keystrokesWithIds.filter(ks => !ks.id)

      if (missingIds.length > 0 && sessionId) {
        
        // Fetch the session again to get IDs
        fetch(`/api/session/${sessionId}`)
          .then(res => {
            if (!res.ok) {
              throw new Error(`Failed to fetch session: ${res.status}`)
            }
            return res.json()
          })
          .then(updatedSession => {
            if (updatedSession && updatedSession.keystrokes) {
              // Match by index and update IDs
              const updated = keystrokesWithIds.map((ks, idx) => {
                const savedKs = updatedSession.keystrokes[idx]
                if (savedKs && savedKs.id) {
                  return { ...ks, id: savedKs.id }
                }
                return ks
              })
              setLocalKeystrokes(updated)
              setCropEnd(updated.length - 1)
            } else {
              setLocalKeystrokes(keystrokesWithIds)
              setCropEnd(keystrokesWithIds.length - 1)
            }
          })
          .catch(err => {
            console.error('Failed to fetch session for IDs:', err)
            // Still set keystrokes even if fetch failed
            setLocalKeystrokes(keystrokesWithIds)
            setCropEnd(keystrokesWithIds.length - 1)
          })
      } else {
        // All keystrokes have IDs, set them directly
        setLocalKeystrokes(keystrokesWithIds)
        setCropEnd(keystrokesWithIds.length - 1)
      }
    } else {
      // Empty or no keystrokes array - set empty to prevent infinite loading
      setLocalKeystrokes([])
      setCropEnd(null)
    }
  }, [sessionData]) // Re-initialize when sessionData changes

  // Get cropped keystrokes
  const displayKeystrokes = useMemo(() => {
    if (!localKeystrokes) return []
    const end = cropEnd !== null ? cropEnd + 1 : localKeystrokes.length
    return localKeystrokes.slice(cropStart, end)
  }, [localKeystrokes, cropStart, cropEnd])

  const stats = useMemo(() => {
    if (!displayKeystrokes || displayKeystrokes.length === 0) return null

    // Calculate durations from cropped keystrokes
    const durations = []
    for (let i = 1; i < displayKeystrokes.length; i++) {
      const duration = displayKeystrokes[i].timestamp - displayKeystrokes[i - 1].timestamp
      if (duration > 0) durations.push(duration)
    }

    if (durations.length === 0) return null

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
    const maxDuration = Math.max(...durations)
    const minDuration = Math.min(...durations)

    // Calculate WPM
    const totalTime = displayKeystrokes[displayKeystrokes.length - 1].timestamp - displayKeystrokes[0].timestamp
    const minutes = totalTime / 60000
    const text = displayKeystrokes.map(k => k.key).join('')
    const words = text.split(' ').filter(w => w.length > 0).length
    const wpm = minutes > 0 ? Math.round(words / minutes) : 0

    return {
      avgDuration: avgDuration.toFixed(1),
      maxDuration: maxDuration.toFixed(1),
      minDuration: minDuration.toFixed(1),
      wpm,
      totalKeystrokes: displayKeystrokes.length,
      totalTime: (totalTime / 1000).toFixed(1)
    }
  }, [displayKeystrokes])

  // Calculate WPM per word/chunk (no errors)
  const wpmChartData = useMemo(() => {
    if (!displayKeystrokes || displayKeystrokes.length === 0) return null

    // Build text from keystrokes
    const text = displayKeystrokes.map(k => k.key).join('')
    const words = text.split(' ').filter(w => w.length > 0)
    const targetChunks = 20
    const chunkSize = Math.max(1, Math.floor(words.length / targetChunks))
    
    const chunks = []
    let currentWordChars = []
    let currentWordStartTime = null
    let wordIndex = 0

    for (let i = 0; i < displayKeystrokes.length; i++) {
      const ks = displayKeystrokes[i]
      
      if (currentWordStartTime === null) {
        currentWordStartTime = ks.timestamp
      }
      
      if (ks.key === ' ') {
        currentWordChars = []
        wordIndex++
        
        if (wordIndex % chunkSize === 0 || i === displayKeystrokes.length - 1) {
          const chunkStartTime = chunks.length > 0 
            ? chunks[chunks.length - 1].endTime 
            : displayKeystrokes[0].timestamp
          const chunkEndTime = ks.timestamp
          const chunkTime = chunkEndTime - chunkStartTime
          const minutes = chunkTime / 60000
          const wordsInChunk = Math.min(chunkSize, wordIndex - (chunks.length * chunkSize))
          const wpm = minutes > 0 ? Math.round((wordsInChunk / minutes)) : 0
          
          chunks.push({
            wpm,
            index: chunks.length + 1,
            endTime: chunkEndTime
          })
        }
      } else {
        currentWordChars.push(ks.key)
      }
    }

    // Handle last chunk
    if (chunks.length === 0 || wordIndex % chunkSize !== 0) {
      const lastChunk = chunks[chunks.length - 1]
      const chunkStartTime = lastChunk ? lastChunk.endTime : displayKeystrokes[0].timestamp
      const chunkEndTime = displayKeystrokes[displayKeystrokes.length - 1].timestamp
      const chunkTime = chunkEndTime - chunkStartTime
      const minutes = chunkTime / 60000
      const wordsInChunk = wordIndex - (chunks.length * chunkSize)
      const wpm = minutes > 0 && wordsInChunk > 0 ? Math.round((wordsInChunk / minutes)) : 0
      
      chunks.push({
        wpm,
        index: chunks.length + 1,
        endTime: chunkEndTime
      })
    }

    return chunks.map(c => ({ wpm: c.wpm, index: c.index }))
  }, [displayKeystrokes])

  const chartData = useMemo(() => {
    if (!displayKeystrokes || displayKeystrokes.length === 0) return null

    const labels = displayKeystrokes.map((_, i) => i)
    const durations = displayKeystrokes.map((k, i) => {
      if (i === 0 || !k || !displayKeystrokes[i - 1]) return 0
      
      const prev = displayKeystrokes[i - 1]
      // Check for discontinuity (prev_key doesn't match previous keystroke's key)
      // This indicates a deleted keystroke created a gap - "burn the ends"
      if (k.prev_key !== prev.key) {
        return null // Create gap in chart
      }
      
      const duration = k.timestamp - prev.timestamp
      return isNaN(duration) ? 0 : duration
    })

    return {
      labels,
      datasets: [
        {
          label: 'Inter-Key Latency (ms)',
          data: durations,
          borderColor: (ctx) => {
            // Use different styling for gaps
            if (!ctx.parsed || ctx.parsed.y === null || ctx.parsed.y === undefined) {
              return 'rgba(200, 200, 200, 0.5)'
            }
            return '#4A90E2'
          },
          backgroundColor: (ctx) => {
            if (!ctx.parsed || ctx.parsed.y === null || ctx.parsed.y === undefined) {
              return 'rgba(200, 200, 200, 0.2)'
            }
            return 'rgba(74, 144, 226, 0.1)'
          },
          tension: 0.1,
          fill: false, // Disable fill to avoid Filler plugin requirement
          pointRadius: (ctx) => {
            if (!ctx.parsed || ctx.parsed.y === null || ctx.parsed.y === undefined) {
              return 0
            }
            return 2
          },
          pointHoverRadius: 5,
          spanGaps: false, // Don't connect across gaps
        },
      ],
    }
  }, [displayKeystrokes])

  const wpmChartDataFormatted = useMemo(() => {
    if (!wpmChartData || wpmChartData.length === 0) return null

    const labels = wpmChartData.map(d => d.index)
    const wpmValues = wpmChartData.map(d => d.wpm)

    // Calculate average WPM line
    const avgWPM = wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length
    const avgWPMLine = wpmValues.map(() => avgWPM)

    return {
      labels,
      datasets: [
        {
          label: 'Raw WPM',
          data: wpmValues,
          borderColor: '#4A90E2',
          backgroundColor: 'rgba(74, 144, 226, 0.1)',
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          fill: true,
        },
        {
          label: 'Average WPM',
          data: avgWPMLine,
          borderColor: '#6B8E23',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0,
          pointRadius: 0,
        },
      ],
    }
  }, [wpmChartData])

  // Initialize finger annotations from session data with defaults (only on mount or when keystrokes change significantly)
  useEffect(() => {
    if (displayKeystrokes && displayKeystrokes.length > 0) {
      const initial = {}
      displayKeystrokes.forEach((ks, idx) => {
        // Use the actual ID if available, otherwise use index-based key
        const keystrokeId = ks.id ? ks.id.toString() : `keystroke-${idx}`
        // Use saved annotation if exists, otherwise use default based on key
        const defaultFinger = getDefaultFinger(ks.key)
        initial[keystrokeId] = {
          finger: ks.finger || defaultFinger,
          hand: ks.hand || getDefaultHand(ks.finger || defaultFinger)
        }
        // Also store by ID if available
        if (ks.id) {
          initial[ks.id.toString()] = initial[keystrokeId]
        }
      })
      // Only update if annotations are empty or if we have new keystrokes
      setFingerAnnotations(prev => {
        // If prev is empty or significantly different, replace it
        if (Object.keys(prev).length === 0) {
          return initial
        }
        // Otherwise merge, keeping existing annotations
        return { ...initial, ...prev }
      })
    }
  }, [displayKeystrokes?.length, displayKeystrokes?.[0]?.id]) // Only re-run when keystrokes change significantly

  const handleFingerChange = (keystrokeId, field, value) => {
    setFingerAnnotations(prev => ({
      ...prev,
      [keystrokeId]: {
        ...prev[keystrokeId],
        [field]: value,
        // Auto-update hand based on finger
        hand: value.startsWith('left') ? 'left' : value.startsWith('right') ? 'right' : prev[keystrokeId]?.hand
      }
    }))
  }

  const handleSaveAnnotations = async () => {
    // Check for session ID - try multiple possible locations
    const sessionId = sessionData?.session_id || sessionData?.id
    
    if (!sessionId) {
      console.error('No session ID found in sessionData:', sessionData)
      setAnnotationStatus({ 
        type: 'error', 
        message: 'No session ID available. Please refresh and try again, or start a new session.' 
      })
      return
    }
    
    setAnnotationStatus({ type: 'saving', message: 'Saving annotations...' })

    try {
      // Build annotations array from displayKeystrokes
      const annotations = []
      const missingAnnotations = []
      
      for (let idx = 0; idx < displayKeystrokes.length; idx++) {
        const ks = displayKeystrokes[idx]
        // Only process ambiguous keys
        if (!AMBIGUOUS_KEYS.includes(ks.key.toLowerCase())) continue
        
        // Must have a real ID to save
        if (!ks.id) {
          missingAnnotations.push(`"${ks.key}" (no ID)`)
          continue
        }
        
        // Get the annotation - try both ID formats (string and number)
        const keystrokeIdStr = ks.id.toString()
        const keystrokeIdNum = typeof ks.id === 'number' ? ks.id : parseInt(ks.id)
        const annotation = fingerAnnotations[keystrokeIdStr] || 
                          fingerAnnotations[keystrokeIdNum] || 
                          fingerAnnotations[ks.id]
        
        if (!annotation || !annotation.finger) {
          missingAnnotations.push(`"${ks.key}"`)
          continue
        }
        
        annotations.push({
          keystroke_id: typeof ks.id === 'number' ? ks.id : parseInt(ks.id),
          finger: annotation.finger,
          hand: annotation.hand || (annotation.finger.startsWith('left') ? 'left' : 'right')
        })
      }

      if (missingAnnotations.length > 0) {
        setAnnotationStatus({ 
          type: 'error', 
          message: `Please annotate all ambiguous keys. Missing: ${missingAnnotations.join(', ')}` 
        })
        return
      }

      if (annotations.length === 0) {
        setAnnotationStatus({ type: 'error', message: 'No ambiguous keys found to annotate.' })
        return
      }

      const response = await fetch('/api/update_fingers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          annotations
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to save annotations' }))
        throw new Error(errorData.detail || 'Failed to save annotations')
      }

      const result = await response.json()
      setAnnotationStatus({ 
        type: 'success', 
        message: `Saved ${result.annotations_count} annotations. Features computed!` 
      })

      // Refresh session data to get updated info
      const sessionResponse = await fetch(`/api/session/${sessionId}`)
      if (sessionResponse.ok) {
        const updatedSession = await sessionResponse.json()
        // Update local keystrokes with new annotations
        if (updatedSession.keystrokes) {
          const updated = localKeystrokes.map(ks => {
            const updatedKs = updatedSession.keystrokes.find(uks => uks.id === ks.id)
            return updatedKs ? { ...ks, finger: updatedKs.finger, hand: updatedKs.hand } : ks
          })
          setLocalKeystrokes(updated)
          
          // Update finger annotations state - use ID as key
          const updatedAnnotations = {}
          updated.forEach((ks) => {
            if (ks.id && ks.finger) {
              const keystrokeId = ks.id.toString()
              updatedAnnotations[keystrokeId] = {
                finger: ks.finger,
                hand: ks.hand || (ks.finger.startsWith('left') ? 'left' : 'right')
              }
            }
          })
          setFingerAnnotations(prev => ({ ...prev, ...updatedAnnotations }))
        }
      }
    } catch (err) {
      setAnnotationStatus({ type: 'error', message: err.message })
    }
  }

  const annotationProgress = useMemo(() => {
    if (!displayKeystrokes) return { annotated: 0, total: 0 }
    const ambiguousKeystrokes = displayKeystrokes.filter(ks => AMBIGUOUS_KEYS.includes(ks.key.toLowerCase()))
    const total = ambiguousKeystrokes.length
    const annotated = ambiguousKeystrokes.filter((ks, idx) => {
      const keystrokeId = ks.id || `keystroke-${displayKeystrokes.indexOf(ks)}`
      return fingerAnnotations[keystrokeId]?.finger
    }).length
    return { annotated, total, percent: total > 0 ? Math.round((annotated / total) * 100) : 0 }
  }, [fingerAnnotations, displayKeystrokes])

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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: getChartColors().text
        }
      },
      title: {
        display: true,
        text: 'Keystroke Timing Analysis',
        color: getChartColors().text,
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            try {
              if (context.parsed.y === null) {
                return ['Gap (deleted keystroke)']
              }
              const ks = displayKeystrokes?.[context.dataIndex]
              if (!ks) return [`Duration: ${context.parsed.y?.toFixed(2) || 0}ms`]
              return [
                `Duration: ${context.parsed.y?.toFixed(2) || 0}ms`,
                `Key: "${ks.key === ' ' ? 'SPACE' : ks.key}"`,
                `Previous: "${ks.prev_key === ' ' ? 'SPACE' : (ks.prev_key || 'START')}"`
              ]
            } catch (err) {
              console.error('Error in tooltip callback:', err)
              return ['Error loading data']
            }
          }
        }
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Keystroke Index',
          color: getChartColors().text
        },
        ticks: {
          color: getChartColors().textSub
        },
        grid: {
          color: getChartColors().grid
        }
      },
      y: {
        title: {
          display: true,
          text: 'Duration (ms)',
          color: getChartColors().text
        },
        ticks: {
          color: getChartColors().textSub
        },
        grid: {
          color: getChartColors().grid
        }
      }
    }
  }

  const wpmChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        labels: {
          color: getChartColors().text
        }
      },
      title: {
        display: true,
        text: 'Words per Minute',
        color: getChartColors().text,
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y} WPM`
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Chunk',
          color: getChartColors().text
        },
        ticks: {
          color: getChartColors().textSub
        },
        grid: {
          color: getChartColors().grid
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Words per Minute',
          color: getChartColors().text
        },
        ticks: {
          color: getChartColors().textSub
        },
        grid: {
          color: getChartColors().grid
        }
      },
    }
  }

  // Show loading state while initializing
  if (!sessionData) {
    return (
      <div className="session-review fade-in">
        <div className="card">
          <p>No session data available</p>
          <button onClick={onStartNew}>Start New Session</button>
        </div>
      </div>
    )
  }

  // Show loading state while keystrokes are being initialized
  if (localKeystrokes === null && sessionData.keystrokes && sessionData.keystrokes.length > 0) {
    return (
      <div className="session-review fade-in">
        <div className="card">
          <p>Loading session data...</p>
        </div>
      </div>
    )
  }

  // If we have no keystrokes at all, show error
  if (!localKeystrokes || localKeystrokes.length === 0) {
    return (
      <div className="session-review fade-in">
        <div className="card">
          <h2>Session Complete!</h2>
          <p>No keystroke data available for this session.</p>
          <button onClick={onStartNew}>Start New Session</button>
        </div>
      </div>
    )
  }

  // If stats is null but we have keystrokes, still render the UI with basic info
  if (!stats) {
    return (
      <div className="session-review fade-in">
        <div className="card">
          <h2>Session Complete!</h2>
          <p>Unable to calculate statistics. Keystroke data may be incomplete.</p>
          <p>Keystrokes: {localKeystrokes.length}</p>
          <button onClick={onStartNew}>Start New Session</button>
        </div>
      </div>
    )
  }

  // Safety check - if we somehow get here without stats, render a fallback
  if (!stats) {
    console.error('SessionReview: Stats is null but passed all checks!')
    return (
      <div className="session-review fade-in">
        <div className="card">
          <h2>Session Complete!</h2>
          <p>Error: Unable to calculate statistics.</p>
          <p>Keystrokes: {localKeystrokes?.length || 0}</p>
          <button onClick={onStartNew}>Start New Session</button>
        </div>
      </div>
    )
  }

  // Helper to get word context for ambiguous keys
  const getWordContext = (keystrokeIndex) => {
    if (!displayKeystrokes || keystrokeIndex < 0 || keystrokeIndex >= displayKeystrokes.length) return null
    
    const currentKey = displayKeystrokes[keystrokeIndex].key.toLowerCase()
    
    if (!AMBIGUOUS_KEYS.includes(currentKey)) return null
    
    // Find word boundaries
    let wordStart = keystrokeIndex
    let wordEnd = keystrokeIndex
    
    // Go backwards to find word start
    while (wordStart > 0 && displayKeystrokes[wordStart - 1].key !== ' ') {
      wordStart--
    }
    
    // Go forwards to find word end
    while (wordEnd < displayKeystrokes.length - 1 && displayKeystrokes[wordEnd + 1].key !== ' ') {
      wordEnd++
    }
    
    // Build word
    const word = displayKeystrokes.slice(wordStart, wordEnd + 1).map(k => k.key).join('')
    const keyPosition = keystrokeIndex - wordStart
    
    return { word, keyPosition, key: currentKey }
  }

  const handleApplyCrop = () => {
    if (cropStart === 0 && (cropEnd === null || cropEnd === localKeystrokes.length - 1)) {
      return // No crop needed
    }
    
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
  }

  return (
    <div className="session-review fade-in">
      <div className="card">
        <h2>Session Complete!</h2>
        
        <div className="stats-inline">
          <span><strong>Time:</strong> {stats.totalTime}s</span>
          <span><strong>Keystrokes:</strong> {stats.totalKeystrokes}</span>
          <span><strong>WPM:</strong> {stats.wpm}</span>
          <span><strong>Avg Latency:</strong> {stats.avgDuration}ms</span>
          <span><strong>Range:</strong> {stats.minDuration}-{stats.maxDuration}ms</span>
        </div>
      </div>

      {/* Keystroke Timing Graph - Moved to top */}
      <div className="card chart-container">
        <div className="chart-header">
          <h3>Keystroke Timing Analysis</h3>
        </div>
        <div style={{ height: '400px' }}>
          {chartData ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666666' }}>
              No chart data available
            </div>
          )}
        </div>
        
        {/* Crop controls */}
        <div className="crop-controls">
          <div className="crop-input-group">
            <label>Crop Start:</label>
            <input
              type="number"
              min="0"
              max={localKeystrokes ? localKeystrokes.length - 1 : 0}
              value={cropStart}
              onChange={(e) => setCropStart(Math.max(0, Math.min(parseInt(e.target.value) || 0, cropEnd !== null ? cropEnd : (localKeystrokes?.length || 0) - 1)))}
            />
          </div>
          <div className="crop-input-group">
            <label>Crop End:</label>
            <input
              type="number"
              min={cropStart}
              max={localKeystrokes ? localKeystrokes.length - 1 : 0}
              value={cropEnd !== null ? cropEnd : (localKeystrokes?.length || 0) - 1}
              onChange={(e) => {
                const maxIndex = localKeystrokes ? Math.max(0, localKeystrokes.length - 1) : 0
                const value = parseInt(e.target.value) || 0
                setCropEnd(Math.max(cropStart, Math.min(value, maxIndex)))
              }}
            />
          </div>
          <button onClick={handleApplyCrop} className="crop-button">
            Apply Crop
          </button>
        </div>
      </div>

      {wpmChartDataFormatted && (
        <div className="card chart-container">
          <div style={{ height: '400px' }}>
            <Line data={wpmChartDataFormatted} options={wpmChartOptions} />
          </div>
        </div>
      )}

      <div className="card finger-annotation">
        <div className="annotation-header">
          <h3>Finger Annotation - Ambiguous Keys</h3>
          <div className="annotation-progress">
            {annotationProgress.annotated} / {annotationProgress.total} annotated ({annotationProgress.percent}%)
          </div>
        </div>
        
        <p className="annotation-description">
          Please specify which finger you used for the following keys (b, y, u, e, i). All other keys use default assignments.
        </p>

        <div className="annotation-interface">
          {/* Show only ambiguous keys with their word context */}
          <div className="annotation-list">
            {displayKeystrokes.map((ks, idx) => {
              const isAmbiguous = AMBIGUOUS_KEYS.includes(ks.key.toLowerCase())
              
              if (!isAmbiguous) return null
              
              // Use ID as key, fallback to index if no ID
              const keystrokeId = ks.id ? ks.id.toString() : `keystroke-${idx}`
              const annotationKey = ks.id ? ks.id.toString() : keystrokeId
              const currentFinger = fingerAnnotations[annotationKey]?.finger || fingerAnnotations[keystrokeId]?.finger || getDefaultFinger(ks.key) || ''
              const wordContext = getWordContext(idx)
              
              return (
                <div key={keystrokeId} className="keystroke-annotation">
                  <span className="keystroke-key">
                    <strong>"{ks.key === ' ' ? 'SPACE' : ks.key}"</strong>
                    {ks.prev_key && <span className="transition"> ← "{ks.prev_key === ' ' ? 'SPACE' : ks.prev_key}"</span>}
                    {!ks.id && <span className="warning-text"> (No ID - cannot save)</span>}
                  </span>
                  {wordContext && (
                    <span className="word-context">
                      Word: <span className="word-highlight">
                        {wordContext.word.split('').map((char, i) => 
                          i === wordContext.keyPosition ? (
                            <span key={i} className="highlighted-char">{char}</span>
                          ) : (
                            <span key={i}>{char}</span>
                          )
                        )}
                      </span>
                    </span>
                  )}
                  <select
                    value={currentFinger}
                    onChange={(e) => {
                      e.stopPropagation()
                      const newValue = e.target.value
                      // Update both keys if ID exists
                      if (ks.id) {
                        handleFingerChange(ks.id.toString(), 'finger', newValue)
                      }
                      handleFingerChange(keystrokeId, 'finger', newValue)
                    }}
                    className="finger-select"
                    required
                    disabled={!ks.id}
                  >
                    <option value="">-- Select Finger (Required) --</option>
                    {FINGER_OPTIONS.map(opt => (
                      <option key={`${keystrokeId}-${opt.value}`} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {(fingerAnnotations[annotationKey]?.finger || fingerAnnotations[keystrokeId]?.finger) && (
                    <span className="annotation-badge">
                      {(fingerAnnotations[annotationKey] || fingerAnnotations[keystrokeId]).hand === 'left' ? 'L' : 'R'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          
          <div className="annotation-actions">
            <button onClick={handleSaveAnnotations} className="primary">
              Save Annotations & Compute Features
            </button>
          </div>

          {annotationStatus && (
            <div className={`annotation-status ${annotationStatus.type}`}>
              {annotationStatus.message}
            </div>
          )}
        </div>
      </div>

      <div className="card actions">
        <button onClick={onStartNew} className="primary">
          Start New Session
        </button>
        {sessionData.session_id && (
          <p className="session-id">Session ID: {sessionData.session_id}</p>
        )}
      </div>
    </div>
  )
}

export default SessionReview