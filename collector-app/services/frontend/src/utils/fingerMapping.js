/**
 * Maps keys to default finger assignments based on user's specification
 */

// Default finger assignments (synced with backend keyboard_layout.py)
const DEFAULT_FINGER_MAP = {
  // Left Ring: Q, A, Z
  'q': 'left_ring',
  'a': 'left_ring',
  'z': 'left_ring',

  // Left Middle: W, S, E
  'w': 'left_middle',
  's': 'left_middle',
  'e': 'left_middle',

  // Left Index: X, D, C, R, T, F, G, V
  'x': 'left_index',
  'd': 'left_index',
  'c': 'left_index',
  'r': 'left_index',
  't': 'left_index',
  'f': 'left_index',
  'g': 'left_index',
  'v': 'left_index',

  // Right Index: B, Y, U, H, J, N, M, K (K is overwritable)
  'b': 'right_index',
  'y': 'right_index',
  'u': 'right_index',
  'h': 'right_index',
  'j': 'right_index',
  'n': 'right_index',
  'm': 'right_index',
  'k': 'right_index',

  // Right Middle: I, O, L, comma
  'i': 'right_middle',
  'o': 'right_middle',
  'l': 'right_middle',
  ',': 'right_middle',

  // Right Ring: P, period
  'p': 'right_ring',
  '.': 'right_ring',

  // Right Pinky: semicolon, slash
  ';': 'right_pinky',
  '/': 'right_pinky',

  // Space - right thumb
  ' ': 'right_thumb',
}

// Get custom finger mappings from localStorage
export function getCustomFingerMap() {
  try {
    const stored = localStorage.getItem('customFingerMap')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to parse custom finger map:', e)
  }
  return {}
}

// Set custom finger mappings in localStorage
export function setCustomFingerMap(customMap) {
  try {
    localStorage.setItem('customFingerMap', JSON.stringify(customMap))
    return true
  } catch (e) {
    console.error('Failed to save custom finger map:', e)
    return false
  }
}

// Get the merged finger map (custom overrides default)
export function getFingerMap() {
  const customMap = getCustomFingerMap()
  return { ...DEFAULT_FINGER_MAP, ...customMap }
}

// Reset finger map to defaults
export function resetFingerMap() {
  localStorage.removeItem('customFingerMap')
}

// Get all letters that have finger assignments
export function getAllLetterKeys() {
  return 'qwertyuiopasdfghjklzxcvbnm'.split('')
}

// Export the default map for reference
export { DEFAULT_FINGER_MAP }

export function getDefaultFinger(key) {
  const keyLower = key.toLowerCase()
  const fingerMap = getFingerMap()
  return fingerMap[keyLower] || ''
}

export function getDefaultHand(finger) {
  if (!finger) return ''
  return finger.startsWith('left') ? 'left' : finger.startsWith('right') ? 'right' : ''
}

// Key positions for row detection (row 0 = home, -1 = top, 1 = bottom)
const KEY_ROWS = {
  'q': -1, 'w': -1, 'e': -1, 'r': -1, 't': -1, 'y': -1, 'u': -1, 'i': -1, 'o': -1, 'p': -1,
  'a': 0, 's': 0, 'd': 0, 'f': 0, 'g': 0, 'h': 0, 'j': 0, 'k': 0, 'l': 0, ';': 0,
  'z': 1, 'x': 1, 'c': 1, 'v': 1, 'b': 1, 'n': 1, 'm': 1, ',': 1, '.': 1, '/': 1,
  ' ': 2,
}

// Finger order for roll detection (0 = pinky, 3 = index, 4 = thumb)
const FINGER_ORDER = {
  'left_pinky': 0, 'left_ring': 1, 'left_middle': 2, 'left_index': 3, 'left_thumb': 4,
  'right_thumb': 4, 'right_index': 3, 'right_middle': 2, 'right_ring': 1, 'right_pinky': 0,
}

/**
 * Classify a digraph by its biomechanical archetype.
 *
 * Archetypes:
 * - same-finger: Both keys typed by same finger (slowest)
 * - inward-roll: Movement toward thumb on same hand (fast)
 * - outward-roll: Movement away from thumb on same hand (slower)
 * - cross-hand: Alternating hands (can be fast)
 * - row-jump: Same hand, same/adjacent fingers but different row
 * - adjacent: Same hand, neighboring fingers, same row
 *
 * @param {string} pattern - 2-character digraph
 * @returns {object} { archetype, label, color, description }
 */
export function classifyDigraph(pattern) {
  if (!pattern || pattern.length < 2) {
    return { archetype: 'unknown', label: '?', color: '#888', description: 'Unknown pattern' }
  }

  const key1 = pattern[0].toLowerCase()
  const key2 = pattern[1].toLowerCase()

  const fingerMap = getFingerMap()
  const finger1 = fingerMap[key1]
  const finger2 = fingerMap[key2]

  if (!finger1 || !finger2) {
    return { archetype: 'unknown', label: '?', color: '#888', description: 'Unknown keys' }
  }

  const hand1 = finger1.startsWith('left') ? 'left' : 'right'
  const hand2 = finger2.startsWith('left') ? 'left' : 'right'

  const row1 = KEY_ROWS[key1] ?? 0
  const row2 = KEY_ROWS[key2] ?? 0
  const rowDiff = Math.abs(row1 - row2)

  // Cross-hand: alternating hands
  if (hand1 !== hand2) {
    return {
      archetype: 'cross-hand',
      label: 'XH',
      color: '#9C27B0',
      description: 'Cross-hand alternation'
    }
  }

  // Same-finger: slowest pattern
  if (finger1 === finger2) {
    return {
      archetype: 'same-finger',
      label: 'SF',
      color: '#F44336',
      description: 'Same finger repeat'
    }
  }

  // Same hand patterns
  const order1 = FINGER_ORDER[finger1]
  const order2 = FINGER_ORDER[finger2]
  const orderDiff = order2 - order1

  // Inward roll: pinky → index direction (order increases for left, decreases for right)
  // For left hand: higher order = more inward (toward thumb)
  // For right hand: lower order = more inward (toward thumb)
  const isInward = hand1 === 'left' ? orderDiff > 0 : orderDiff < 0

  if (rowDiff === 0) {
    // Same row
    if (Math.abs(orderDiff) === 1) {
      // Adjacent fingers
      return isInward
        ? { archetype: 'inward-roll', label: 'IR', color: '#4CAF50', description: 'Inward roll (fast)' }
        : { archetype: 'outward-roll', label: 'OR', color: '#FF9800', description: 'Outward roll' }
    } else {
      // Skip fingers
      return isInward
        ? { archetype: 'inward-skip', label: 'IS', color: '#8BC34A', description: 'Inward skip' }
        : { archetype: 'outward-skip', label: 'OS', color: '#FFC107', description: 'Outward skip' }
    }
  } else {
    // Row jump
    return {
      archetype: 'row-jump',
      label: 'RJ',
      color: '#2196F3',
      description: `Row jump (${rowDiff} row${rowDiff > 1 ? 's' : ''})`
    }
  }
}

