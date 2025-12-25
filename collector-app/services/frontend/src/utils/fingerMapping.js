/**
 * Maps keys to default finger assignments based on user's specification
 */

const FINGER_MAP = {
  // Left Ring: A, Z, Q
  'a': 'left_ring',
  'z': 'left_ring',
  'q': 'left_ring',
  
  // Left Middle: W, S, E
  'w': 'left_middle',
  's': 'left_middle',
  'e': 'left_middle',
  
  // Left Index: X, C, V, D, F, G, R, T, sometimes Y
  'x': 'left_index',
  'c': 'left_index',
  'v': 'left_index',
  'd': 'left_index',
  'f': 'left_index',
  'g': 'left_index',
  'r': 'left_index',
  't': 'left_index',
  'y': 'left_index', // sometimes Y (user can override)
  
  // Right Index: Y, U, H, J, K, B, N, M
  'u': 'right_index',
  'h': 'right_index',
  'j': 'right_index',
  'k': 'right_index',
  'b': 'right_index',
  'n': 'right_index',
  'm': 'right_index',
  
  // Right Middle: I, O, L
  'i': 'right_middle',
  'o': 'right_middle',
  'l': 'right_middle',
  
  // Right Ring: P
  'p': 'right_ring',
  
  // Space - default to right index, user can change
  ' ': 'right_index',
}

export function getDefaultFinger(key) {
  const keyLower = key.toLowerCase()
  return FINGER_MAP[keyLower] || ''
}

export function getDefaultHand(finger) {
  if (!finger) return ''
  return finger.startsWith('left') ? 'left' : finger.startsWith('right') ? 'right' : ''
}

