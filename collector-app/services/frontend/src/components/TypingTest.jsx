import { useState, useEffect, useRef } from 'react'
import './TypingTest.css'

function TypingTest({ mode, onSessionComplete }) {
  const [text, setText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [keystrokes, setKeystrokes] = useState([])
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const startTimeRef = useRef(null)

  // Load text when mode changes
  useEffect(() => {
    loadText()
  }, [mode])

  const loadText = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/generate/${mode}`)
      if (!response.ok) throw new Error('Failed to load text')
      const data = await response.json()
      setText(data.text)
      setCurrentIndex(0)
      setKeystrokes([])
      setIsActive(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    // Ignore if not active or no text loaded
    if (!text || currentIndex >= text.length) return

    // Tab to restart
    if (e.key === 'Tab') {
      e.preventDefault()
      loadText()
      return
    }

    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault()
      loadText()
      return
    }

    // Ignore modifier keys
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return

    // Start timing on first keypress
    if (!isActive) {
      setIsActive(true)
      startTimeRef.current = performance.now()
    }

    const targetChar = text[currentIndex]
    const timestamp = performance.now()

    // Only accept correct keypresses
    if (e.key === targetChar) {
      const newKeystroke = {
        key: e.key,
        timestamp: timestamp,
        prev_key: currentIndex > 0 ? text[currentIndex - 1] : null,
        index: currentIndex
      }

      setKeystrokes(prev => [...prev, newKeystroke])
      setCurrentIndex(prev => prev + 1)

      // Check if finished
      if (currentIndex + 1 >= text.length) {
        finishSession([...keystrokes, newKeystroke])
      }
    }
  }

  const finishSession = async (finalKeystrokes) => {
    setIsActive(false)
    
    // Calculate durations
    const keystrokesWithDuration = finalKeystrokes.map((k, i) => {
      if (i === 0) {
        return { ...k, duration: 0 }
      }
      return {
        ...k,
        duration: k.timestamp - finalKeystrokes[i - 1].timestamp
      }
    })

    const sessionData = {
      mode,
      text,
      keystrokes: keystrokesWithDuration,
      totalTime: keystrokesWithDuration[keystrokesWithDuration.length - 1].timestamp - startTimeRef.current,
      timestamp: Date.now()
    }

    // Save to backend
    try {
      const response = await fetch('/api/submit_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: sessionData.mode,
          raw_text: sessionData.text,
          keystrokes: sessionData.keystrokes.map(k => ({
            key: k.key,
            timestamp: k.timestamp,
            prev_key: k.prev_key
          }))
        })
      })

      if (!response.ok) throw new Error('Failed to save session')
      const result = await response.json()
      sessionData.session_id = result.session_id
    } catch (err) {
      console.error('Failed to save session:', err)
    }

    onSessionComplete(sessionData)
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [text, currentIndex, isActive, keystrokes])

  const renderText = () => {
    return text.split('').map((char, index) => {
      let className = 'char'
      if (index === currentIndex) {
        className += ' current'
      } else if (index < currentIndex) {
        className += ' correct'
      } else {
        className += ' pending'
      }

      return (
        <span key={index} className={className}>
          {char}
        </span>
      )
    })
  }

  if (isLoading) {
    return (
      <div className="card typing-test">
        <div className="loading">Loading text...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card typing-test">
        <div className="error">Error: {error}</div>
        <button onClick={loadText}>Retry</button>
      </div>
    )
  }

  return (
    <div className="card typing-test fade-in">
      <div className="stats">
        <div className="stat">
          <span className="stat-label">Progress</span>
          <span className="stat-value">{currentIndex} / {text.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Mode</span>
          <span className="stat-value">{mode}</span>
        </div>
      </div>

      <div className="text-display">
        {text && renderText()}
      </div>

      {!isActive && currentIndex === 0 && (
        <div className="instruction">
          Start typing to begin...
        </div>
      )}
    </div>
  )
}

export default TypingTest