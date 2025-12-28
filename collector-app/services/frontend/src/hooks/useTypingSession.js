/**
 * Hook for managing an active typing session.
 */

import { useState, useCallback, useRef } from 'react';
import { generateApi, sessionApi } from '../api/client';

export function useTypingSession(mode) {
  const [text, setText] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [keystrokes, setKeystrokes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startTimeRef = useRef(null);

  const loadText = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateApi.text(mode);
      setText(data.text);
      setCurrentIndex(0);
      setKeystrokes([]);
      setIsActive(false);
      startTimeRef.current = null;
      return data.text;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [mode]);

  const startSession = useCallback(() => {
    setIsActive(true);
    startTimeRef.current = performance.now();
  }, []);

  const recordKeystroke = useCallback((key, timestamp) => {
    const prevKey = keystrokes.length > 0
      ? keystrokes[keystrokes.length - 1].key
      : null;

    setKeystrokes(prev => [...prev, {
      key,
      timestamp,
      prev_key: prevKey,
    }]);
    setCurrentIndex(prev => prev + 1);
  }, [keystrokes]);

  const endSession = useCallback(async () => {
    if (!text || keystrokes.length === 0) return null;

    setIsActive(false);
    setLoading(true);
    setError(null);

    try {
      const sessionData = {
        mode,
        raw_text: text,
        keystrokes: keystrokes.map(k => ({
          key: k.key,
          timestamp: k.timestamp / 1000, // Convert to seconds for backend
          prev_key: k.prev_key,
        })),
      };

      const result = await sessionApi.submit(sessionData);
      return {
        ...result,
        keystrokes,
        raw_text: text,
        mode,
      };
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [text, keystrokes, mode]);

  const reset = useCallback(() => {
    setText('');
    setCurrentIndex(0);
    setKeystrokes([]);
    setIsActive(false);
    setError(null);
    startTimeRef.current = null;
  }, []);

  const isComplete = text && currentIndex >= text.length;

  return {
    text,
    isActive,
    currentIndex,
    keystrokes,
    loading,
    error,
    isComplete,
    loadText,
    startSession,
    recordKeystroke,
    endSession,
    reset,
  };
}

export default useTypingSession;
