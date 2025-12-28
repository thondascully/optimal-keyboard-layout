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
  const [cursorPosition, setCursorPosition] = useState({ left: 0, top: 0, width: 0, height: 0 })
  const startTimeRef = useRef(null)
  const textDisplayRef = useRef(null)
  const charRefs = useRef([])
  const cursorRef = useRef(null)
  
  // Trigraph test mode state
  const [trigraphTestState, setTrigraphTestState] = useState({
    currentTrigraph: '',
    isTestRun: true, // true = practice run, false = real run
    allKeystrokes: [], // Accumulate all trigraph keystrokes
    trigraphIndex: 0
  })

  // Load text when mode changes
  useEffect(() => {
    if (mode === 'trigraph_test') {
      // Reset trigraph test state when entering this mode
      setTrigraphTestState({
        currentTrigraph: '',
        isTestRun: true,
        allKeystrokes: [],
        trigraphIndex: 0
      })
      loadNextTrigraph()
    } else {
      loadText()
    }
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

  const loadNextTrigraph = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/generate/trigraph_test`)
      if (!response.ok) throw new Error('Failed to load trigraph')
      const data = await response.json()
      const trigraph = data.text
      setTrigraphTestState(prev => ({
        ...prev,
        currentTrigraph: trigraph,
        isTestRun: true, // Start with test run
        trigraphIndex: prev.trigraphIndex + 1
      }))
      setText(trigraph)
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
      if (mode === 'trigraph_test') {
        loadNextTrigraph()
      } else {
        loadText()
      }
      return
    }

    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault()
      if (mode === 'trigraph_test') {
        loadNextTrigraph()
      } else {
        loadText()
      }
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
        if (mode === 'trigraph_test') {
          handleTrigraphComplete([...keystrokes, newKeystroke])
        } else {
          finishSession([...keystrokes, newKeystroke])
        }
      }
    }
  }

  const handleTrigraphComplete = async (finalKeystrokes) => {
    setIsActive(false)
    
    const { isTestRun, currentTrigraph, allKeystrokes, trigraphIndex } = trigraphTestState
    
    if (isTestRun) {
      // Test run complete - switch to real run
      setTrigraphTestState(prev => ({
        ...prev,
        isTestRun: false
      }))
      // Reset for real run
      setCurrentIndex(0)
      setKeystrokes([])
      setIsActive(false)
      // Text stays the same (same trigraph)
    } else {
      // Real run complete - save and move to next trigraph
      const updatedAllKeystrokes = [...allKeystrokes, ...finalKeystrokes]
      
      // Save this trigraph's data
      const sessionData = {
        mode: 'trigraph_test',
        text: currentTrigraph,
        keystrokes: finalKeystrokes.map((k, i) => ({
          ...k,
          duration: i === 0 ? 0 : k.timestamp - finalKeystrokes[i - 1].timestamp
        })),
        totalTime: finalKeystrokes[finalKeystrokes.length - 1].timestamp - startTimeRef.current,
        timestamp: Date.now(),
        trigraph: currentTrigraph,
        trigraphIndex: trigraphIndex
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
              timestamp: k.timestamp / 1000,
              prev_key: k.prev_key
            }))
          })
        })

        if (response.ok) {
          const result = await response.json()
          sessionData.session_id = result.session_id
        }
      } catch (err) {
        console.error('Failed to save trigraph session:', err)
      }
      
      // Update state and load next trigraph
      setTrigraphTestState(prev => ({
        ...prev,
        allKeystrokes: updatedAllKeystrokes,
        isTestRun: true // Reset for next trigraph
      }))
      
      // Small delay before loading next trigraph
      setTimeout(() => {
        loadNextTrigraph()
      }, 500)
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
    onSessionComplete(sessionData)
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [text, currentIndex, isActive, keystrokes])

  // Update cursor position smoothly
  useEffect(() => {
    if (!textDisplayRef.current || !text || currentIndex >= text.length) return
    
    const updateCursor = () => {
      const container = textDisplayRef.current
      if (!container) return
      
      if (currentIndex === 0) {
        // Position at start - find first character
        const firstChar = charRefs.current[0]
        if (firstChar) {
          const charRect = firstChar.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()
          setCursorPosition({
            left: charRect.left - containerRect.left,
            top: charRect.top - containerRect.top,
            width: charRect.width || 8,
            height: charRect.height
          })
        }
      } else if (currentIndex < text.length) {
        // Position at current character
        const targetChar = charRefs.current[currentIndex]
        if (targetChar) {
          const charRect = targetChar.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()
          setCursorPosition({
            left: charRect.left - containerRect.left,
            top: charRect.top - containerRect.top,
            width: charRect.width || 8,
            height: charRect.height
          })
        }
      } else {
        // Position after last character
        const lastChar = charRefs.current[text.length - 1]
        if (lastChar) {
          const charRect = lastChar.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()
          setCursorPosition({
            left: charRect.right - containerRect.left,
            top: charRect.top - containerRect.top,
            width: 2,
            height: charRect.height
          })
        }
      }
    }

    // Use requestAnimationFrame for smooth updates
    const rafId = requestAnimationFrame(updateCursor)
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
      {mode === 'trigraph_test' && (
        <div className="trigraph-test-header">
          <div className="trigraph-display">
            <div className="trigraph-label">Trigraph #{trigraphTestState.trigraphIndex}</div>
            <div className="trigraph-text">{trigraphTestState.currentTrigraph}</div>
            <div className="trigraph-run-type">
              {trigraphTestState.isTestRun ? 'Test Run (Practice)' : 'Real Run (Recording)'}
            </div>
          </div>
        </div>
      )}
      
      <TypingStats 
        currentIndex={currentIndex} 
        totalLength={text.length} 
        mode={mode} 
      />

      <div className="text-display" ref={textDisplayRef}>
        {text && renderText()}
        {text && currentIndex < text.length && (
          <span 
            ref={cursorRef}
            className="typing-cursor-smooth"
            style={{ 
              left: `${cursorPosition.left}px`, 
              top: `${cursorPosition.top}px`,
              width: `${cursorPosition.width}px`,
              height: `${cursorPosition.height}px`
            }}
          />
        )}
      </div>
      
      {mode === 'trigraph_test' && !isActive && text && (
        <div className="trigraph-instruction">
          Start typing to begin {trigraphTestState.isTestRun ? 'practice' : 'recording'}
        </div>
      )}
    </div>
  )
}

export default TypingTest