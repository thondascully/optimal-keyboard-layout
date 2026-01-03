/**
 * Shared constants used across components
 */

// All potentially overwritable letters - users can toggle which ones to show
export const ALL_OVERWRITABLE_KEYS = ['b', 'y', 'u', 'e', 'i', 'k']

// Default enabled overwritable keys
export const DEFAULT_OVERWRITABLE_KEYS = ['b', 'y', 'u', 'e', 'i', 'k']

// Helper to get enabled overwritable keys from localStorage
export const getEnabledOverwritableKeys = () => {
  try {
    const stored = localStorage.getItem('enabledOverwritableKeys')
    if (stored) {
      const parsed = JSON.parse(stored)
      // Validate it's an array of valid keys
      if (Array.isArray(parsed)) {
        return parsed.filter(k => ALL_OVERWRITABLE_KEYS.includes(k))
      }
    }
  } catch (e) {
    console.error('Failed to parse enabled overwritable keys:', e)
  }
  return DEFAULT_OVERWRITABLE_KEYS
}

// Helper to save enabled overwritable keys to localStorage
export const setEnabledOverwritableKeys = (keys) => {
  try {
    const valid = keys.filter(k => ALL_OVERWRITABLE_KEYS.includes(k))
    localStorage.setItem('enabledOverwritableKeys', JSON.stringify(valid))
    return valid
  } catch (e) {
    console.error('Failed to save enabled overwritable keys:', e)
    return DEFAULT_OVERWRITABLE_KEYS
  }
}

// Legacy export for backwards compatibility
export const AMBIGUOUS_KEYS = getEnabledOverwritableKeys()

export const FINGER_OPTIONS = [
  { value: 'left_pinky', label: 'Left Pinky (Shift)' },
  { value: 'left_ring', label: 'Left Ring (A, Z, Q)' },
  { value: 'left_middle', label: 'Left Middle (W, S, E)' },
  { value: 'left_index', label: 'Left Index (X, C, V, D, F, G, R, T, sometimes Y)' },
  { value: 'right_index', label: 'Right Index (Y, U, H, J, K, B, N, M)' },
  { value: 'right_middle', label: 'Right Middle (I, O, L)' },
  { value: 'right_ring', label: 'Right Ring (P)' },
]

