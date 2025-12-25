import { useState, useEffect, useRef } from 'react'
import TypingStats from './TypingStats'
import './TypingTest.css'

function TypingTest({ mode, onSessionComplete }) {
  const [text, setText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [keystrokes, setKeystrokes] = useState([])
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cursorLeft, setCursorLeft] = useState(0)
  const [cursorTop, setCursorTop] = useState(0)
  const startTimeRef = useRef(null)
  const textDisplayRef = useRef(null)
  const charRefs = useRef([])

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

    // Prevent spacebar from scrolling page
    if (e.key === ' ') {
      e.preventDefault()
    }

    // Ignore modifier keys
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return

    // Start timing on first keypress
    if (!isActive) {
      setIsActive(true)
      startTimeRef.current = Date.now() // Use Date.now() for consistency
    }

    const targetChar = text[currentIndex]
    const timestamp = Date.now() // Use Date.now() instead of performance.now()

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
    // Backend expects timestamps in seconds (time.time() format)
    // Frontend uses milliseconds (Date.now()), so convert to seconds
    try {
      const response = await fetch('/api/submit_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: sessionData.mode,
          raw_text: sessionData.text,
          keystrokes: sessionData.keystrokes.map(k => ({
            key: k.key,
            timestamp: k.timestamp / 1000, // Convert milliseconds to seconds
            prev_key: k.prev_key
          }))
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to save session: ${errorText}`)
      }
      
      const result = await response.json()
      if (!result.session_id) {
        throw new Error('Session saved but no session_id returned')
      }
      
      sessionData.session_id = result.session_id
      console.log('Session saved with ID:', sessionData.session_id)
      
      // Fetch the saved session to get keystroke IDs
      // Retry up to 3 times with increasing delays (database might need a moment)
      let savedSession = null
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 200 * attempt)) // 200ms, 400ms delays
        }
        
        const sessionResponse = await fetch(`/api/session/${result.session_id}`)
        if (sessionResponse.ok) {
          savedSession = await sessionResponse.json()
          if (savedSession && savedSession.keystrokes && savedSession.keystrokes.length > 0) {
            break
          }
        }
      }
      
      if (savedSession && savedSession.keystrokes) {
        console.log(`Fetched ${savedSession.keystrokes.length} keystrokes from backend`)
        
        // Match keystrokes by index (they should be in the same order)
        sessionData.keystrokes = sessionData.keystrokes.map((ks, idx) => {
          const savedKs = savedSession.keystrokes[idx]
          
          if (savedKs && savedKs.id) {
            // Verify it's the same key (safety check)
            if (savedKs.key === ks.key) {
              return {
                ...ks,
                id: savedKs.id,
                finger: savedKs.finger || null,
                hand: savedKs.hand || null,
                // Keep frontend timestamp in milliseconds
                timestamp: ks.timestamp
              }
            } else {
              // Keys don't match - try to find by key in saved session
              const foundKs = savedSession.keystrokes.find(sks => sks.key === ks.key && sks.id)
              if (foundKs) {
                return {
                  ...ks,
                  id: foundKs.id,
                  finger: foundKs.finger || null,
                  hand: foundKs.hand || null,
                  timestamp: ks.timestamp
                }
              }
            }
          }
          
          // If no match found, log warning
          console.warn(`Could not match keystroke ${idx} (key: "${ks.key}")`)
          return ks
        })
        
        // Verify all keystrokes have IDs
        const missingIds = sessionData.keystrokes.filter(ks => !ks.id)
        if (missingIds.length > 0) {
          console.error(`Warning: ${missingIds.length} keystrokes missing IDs after matching`)
        } else {
          console.log('All keystrokes have IDs')
        }
      } else {
        console.error('Failed to fetch session data or no keystrokes found')
      }
    } catch (err) {
      console.error('Failed to save session:', err)
      // Still pass sessionData even if save failed, so user can see what happened
      alert(`Failed to save session: ${err.message}`)
    }

    // Always call onSessionComplete, even if save failed
    // This ensures the UI shows the session review
    console.log('Calling onSessionComplete with session_id:', sessionData.session_id)
    onSessionComplete(sessionData)
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [text, currentIndex, isActive, keystrokes])

  // Update cursor position smoothly
  useEffect(() => {
    if (!textDisplayRef.current || !text) return
    
    const updateCursorPosition = () => {
      const container = textDisplayRef.current
      if (!container) return
      
      const containerRect = container.getBoundingClientRect()
      
      if (currentIndex === 0) {
        // Position at the start
        setCursorLeft(32) // 2rem padding = 32px
        setCursorTop(34) // 2rem padding + 2px for alignment
      } else if (currentIndex < text.length) {
        // Position at current character
        const targetChar = charRefs.current[currentIndex]
        if (targetChar) {
          const charRect = targetChar.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()
          setCursorLeft(charRect.left - containerRect.left)
          // Align cursor with text baseline - adjust for proper alignment
          setCursorTop(charRect.top - containerRect.top + 2)
        }
      } else {
        // Position at the end (after last character)
        const lastChar = charRefs.current[text.length - 1]
        if (lastChar) {
          const charRect = lastChar.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()
          setCursorLeft(charRect.right - containerRect.left)
          setCursorTop(charRect.top - containerRect.top + 2)
        }
      }
    }

    // Use requestAnimationFrame for smooth updates
    const rafId = requestAnimationFrame(() => {
      updateCursorPosition()
    })
    return () => cancelAnimationFrame(rafId)
  }, [currentIndex, text])

  const renderText = () => {
    // Split text into words to prevent word breaking
    const words = text.split(' ')
    let charIndex = 0
    
    return words.map((word, wordIndex) => {
      const wordChars = word.split('').map((char, charPos) => {
        const idx = charIndex++
        let className = 'char'
        if (idx === currentIndex) {
          className += ' current'
        } else if (idx < currentIndex) {
          className += ' correct'
        } else {
          className += ' pending'
        }

        return (
          <span 
            key={idx} 
            className={className}
            ref={el => charRefs.current[idx] = el}
          >
            {char}
          </span>
        )
      })
      
      // Add space after word (except last word)
      if (wordIndex < words.length - 1) {
        const spaceIdx = charIndex++
        let spaceClassName = 'char'
        if (spaceIdx === currentIndex) {
          spaceClassName += ' current'
        } else if (spaceIdx < currentIndex) {
          spaceClassName += ' correct'
        } else {
          spaceClassName += ' pending'
        }
        
        return (
          <span key={`word-${wordIndex}`} className="word-wrapper">
            {wordChars}
            <span 
              key={spaceIdx}
              className={spaceClassName}
              ref={el => charRefs.current[spaceIdx] = el}
            >
              {'\u00A0'}
            </span>
          </span>
        )
      }
      
      return <span key={`word-${wordIndex}`} className="word-wrapper">{wordChars}</span>
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
      <TypingStats 
        currentIndex={currentIndex} 
        totalLength={text.length} 
        mode={mode} 
      />

      <div className="text-display" ref={textDisplayRef}>
        {text && renderText()}
        {text && (
          <span 
            className="typing-cursor"
            style={{ left: `${cursorLeft}px`, top: `${cursorTop}px` }}
          />
        )}
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