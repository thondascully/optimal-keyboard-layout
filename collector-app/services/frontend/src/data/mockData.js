/**
 * Mock data for tabs that don't have real backend support yet.
 * Used for: Week 0 Validation, Model Training, Cost Matrix, Layout Optimizer, Layout Comparison, Final Analysis
 */

// Generate realistic mock training progress
function generateTrainingLoss(epochs = 150, currentEpoch = 75) {
  const trainingLoss = [];
  const validationLoss = [];

  for (let i = 0; i < currentEpoch; i++) {
    const baseLoss = 0.5 * Math.exp(-i / 30) + 0.02;
    trainingLoss.push(baseLoss + Math.random() * 0.02);
    validationLoss.push(baseLoss * 1.1 + Math.random() * 0.03);
  }

  return { trainingLoss, validationLoss };
}

// Generate 26x26 cost matrix
function generateCostMatrix() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const matrix = [];

  for (let i = 0; i < 26; i++) {
    const row = [];
    for (let j = 0; j < 26; j++) {
      // Generate realistic costs - nearby keys are faster
      const distance = Math.abs(i - j);
      const baseCost = 80 + distance * 15 + Math.random() * 50;
      row.push(Math.round(baseCost));
    }
    matrix.push(row);
  }

  return { matrix, letters };
}

// Generate optimization score history
function generateScoreHistory(iterations = 1000) {
  const history = [];
  let currentScore = 18500;

  for (let i = 0; i < iterations; i++) {
    const improvement = Math.random() * 10 * Math.exp(-i / 200);
    currentScore = Math.max(12000, currentScore - improvement);
    if (i % 10 === 0) {
      history.push({ iteration: i, score: Math.round(currentScore) });
    }
  }

  return history;
}

export const mockWeek0Validation = {
  status: 'passing',
  tests: [
    {
      id: 'rf_prepared',
      name: 'Random Forest on Prepared Data',
      description: 'Tests if signal exists in trigraph timing data',
      spearman: 0.72,
      threshold: 0.65,
      result: 'pass',
      r2: 0.58,
      mae: 18.3,
      rmse: 24.1,
    },
    {
      id: 'rf_natural',
      name: 'Cross-Domain Validation',
      description: 'Tests if prepared data generalizes to natural typing',
      spearman: 0.58,
      threshold: 0.50,
      result: 'pass',
      r2: 0.42,
      mae: 28.7,
      rmse: 35.2,
    },
    {
      id: 'coverage',
      name: 'Coverage Completeness',
      description: 'All 64 finger pairs have ≥5 samples',
      current: 57,
      target: 64,
      result: 'warning',
    },
  ],
  featureImportance: [
    { feature: 'euclidean_distance', importance: 0.34 },
    { feature: 'same_finger', importance: 0.22 },
    { feature: 'row_difference', importance: 0.18 },
    { feature: 'is_inward', importance: 0.12 },
    { feature: 'fitts_law_cost', importance: 0.08 },
    { feature: 'same_hand', importance: 0.06 },
  ],
  predictions: Array(50).fill(null).map(() => {
    const actual = 80 + Math.random() * 150;
    const predicted = actual * (0.85 + Math.random() * 0.3);
    return { actual: Math.round(actual), predicted: Math.round(predicted) };
  }),
  overall: 'go',
};

const { trainingLoss, validationLoss } = generateTrainingLoss(150, 75);

export const mockModelTraining = {
  status: 'training',
  epochs: 150,
  currentEpoch: 75,
  trainingLoss,
  validationLoss,
  metrics: {
    currentLoss: 0.0234,
    validationR2: 0.71,
    validationSpearman: 0.78,
    mae: 18.3,
    rmse: 24.1,
  },
  hyperparameters: {
    learningRate: 0.001,
    batchSize: 32,
    latentDim: 3,
    physicsWeight: 0.5,
    regularization: 0.1,
  },
  fingerAgility: [
    { finger: 'left_pinky', launch: 0.82, landing: 0.78 },
    { finger: 'left_ring', launch: 0.91, landing: 0.88 },
    { finger: 'left_middle', launch: 0.95, landing: 0.93 },
    { finger: 'left_index', launch: 0.98, landing: 0.96 },
    { finger: 'right_index', launch: 0.97, landing: 0.95 },
    { finger: 'right_middle', launch: 0.94, landing: 0.92 },
    { finger: 'right_ring', launch: 0.89, landing: 0.85 },
    { finger: 'right_pinky', launch: 0.80, landing: 0.76 },
  ],
  estimatedTimeRemaining: '12 min',
  convergenceStatus: 'improving',
};

const { matrix, letters } = generateCostMatrix();

export const mockCostMatrix = {
  matrix,
  letters,
  statistics: {
    minCost: Math.min(...matrix.flat()),
    maxCost: Math.max(...matrix.flat()),
    avgCost: Math.round(matrix.flat().reduce((a, b) => a + b, 0) / 676),
    stdDev: 45,
  },
  topExpensiveBigrams: [
    { bigram: 'QZ', cost: 547, frequency: 0.0001 },
    { bigram: 'XJ', cost: 512, frequency: 0.0002 },
    { bigram: 'ZX', cost: 498, frequency: 0.0001 },
    { bigram: 'QP', cost: 476, frequency: 0.0003 },
    { bigram: 'JQ', cost: 465, frequency: 0.0001 },
  ],
  topCheapBigrams: [
    { bigram: 'TH', cost: 52, frequency: 0.0356 },
    { bigram: 'HE', cost: 58, frequency: 0.0337 },
    { bigram: 'IN', cost: 62, frequency: 0.0287 },
    { bigram: 'ER', cost: 65, frequency: 0.0271 },
    { bigram: 'AN', cost: 68, frequency: 0.0199 },
  ],
  sanityChecks: {
    sameFingerSlower: { passed: true, violations: 0 },
    distanceCorrelation: { passed: true, correlation: 0.78 },
    inwardRollsFaster: { passed: true, avgDifference: -12.3 },
  },
  qwertyBaseline: {
    predictedWpm: 58.3,
    actualWpm: 61.2,
    errorPercent: 4.7,
    sameFingerRate: 0.021,
  },
};

// Generate convergence history for optimizer
function generateConvergenceHistory(iterations = 100) {
  const history = [];
  let cost = 52.5;
  for (let i = 0; i <= iterations; i += 5) {
    const decay = Math.exp(-i / 30);
    const improvement = decay * (Math.random() * 0.3 + 0.1);
    cost = Math.max(38, cost - improvement);
    history.push({ iteration: i * 450, cost: parseFloat(cost.toFixed(2)) });
  }
  return history;
}

export const mockLayoutOptimizer = {
  status: 'running',
  iteration: 45230,
  maxIterations: 100000,
  currentCost: 42.34,
  bestCost: 41.89,
  qwertyCost: 52.34,
  temperature: 0.0234,
  acceptanceRate: 0.34,
  convergenceHistory: generateConvergenceHistory(100),
  currentBestLayout: ['Q', 'W', 'F', 'P', 'G', 'J', 'L', 'U', 'Y', ';', 'A', 'R', 'S', 'T', 'D', 'H', 'N', 'E', 'I', 'O', 'Z', 'X', 'C', 'V', 'B', 'K'],
  qwertyLayout: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', 'Z', 'X', 'C', 'V', 'B', 'N'],
  parameters: {
    initialTemperature: 1.0,
    coolingRate: 0.9999,
    swapsPerIteration: 1,
    maxIterations: 100000,
    parallelChains: 5,
  },
  recentSwaps: [
    { key1: 'E', key2: 'F', delta: -0.234, accepted: true },
    { key1: 'T', key2: 'N', delta: 0.089, accepted: false },
    { key1: 'D', key2: 'G', delta: -0.156, accepted: true },
    { key1: 'H', key2: 'M', delta: 0.312, accepted: false },
    { key1: 'Y', key2: 'U', delta: -0.078, accepted: true },
  ],
};

export const mockLayoutComparison = {
  layouts: [
    {
      id: 'qwerty',
      name: 'QWERTY',
      color: '#888888',
      totalCost: 52.34,
      improvement: 0,
      layout: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', 'Z', 'X', 'C', 'V', 'B', 'N'],
      highlights: [],
      fingerUsage: [12.1, 8.3, 15.2, 22.4, 22.1, 15.0, 8.1, 12.0],
      keyChanges: [],
    },
    {
      id: 'colemak',
      name: 'Colemak',
      color: '#FF9800',
      totalCost: 44.12,
      improvement: 15.7,
      layout: ['Q', 'W', 'F', 'P', 'G', 'J', 'L', 'U', 'Y', ';', 'A', 'R', 'S', 'T', 'D', 'H', 'N', 'E', 'I', 'O', 'Z', 'X', 'C', 'V', 'B', 'K'],
      highlights: ['f', 'p', 'g', 'r', 't', 'd', 'n', 'e', 'k'],
      fingerUsage: [10.5, 11.2, 14.1, 18.3, 18.1, 14.0, 11.0, 10.2],
      keyChanges: [
        { key: 'E', from: 'top row', to: 'home row', reason: 'High frequency' },
        { key: 'T', from: 'top row', to: 'home row', reason: 'High frequency' },
        { key: 'N', from: 'bottom row', to: 'home row', reason: 'Reduce travel' },
      ],
    },
    {
      id: 'optimized',
      name: 'Optimized',
      color: '#4CAF50',
      totalCost: 41.89,
      improvement: 20.0,
      layout: ['Q', 'W', 'F', 'P', 'G', 'J', 'L', 'U', 'Y', ';', 'A', 'R', 'S', 'T', 'D', 'M', 'N', 'E', 'I', 'O', 'Z', 'X', 'C', 'V', 'B', 'K'],
      highlights: ['f', 'p', 'g', 'r', 't', 'd', 'm', 'n', 'e', 'k'],
      fingerUsage: [10.2, 11.8, 13.9, 17.8, 17.5, 14.2, 11.5, 10.0],
      keyChanges: [
        { key: 'E', from: 'top row', to: 'home row', reason: 'Personal speed data' },
        { key: 'T', from: 'top row', to: 'home row', reason: 'Personal speed data' },
        { key: 'M', from: 'bottom row', to: 'home row', reason: 'Your finger agility' },
        { key: 'N', from: 'bottom row', to: 'home row', reason: 'Reduce same-finger' },
      ],
    },
  ],
  comparisonMetrics: [
    { name: 'Speed', values: { qwerty: 58, colemak: 78, optimized: 85 } },
    { name: 'Same-Finger', values: { qwerty: 45, colemak: 72, optimized: 88 } },
    { name: 'Alternation', values: { qwerty: 52, colemak: 68, optimized: 75 } },
    { name: 'Home Row', values: { qwerty: 35, colemak: 82, optimized: 78 } },
    { name: 'Comfort', values: { qwerty: 50, colemak: 75, optimized: 90 } },
  ],
  fingerLabels: ['L.Pinky', 'L.Ring', 'L.Mid', 'L.Index', 'R.Index', 'R.Mid', 'R.Ring', 'R.Pinky'],
  detailedMetrics: [
    { name: 'Predicted WPM', values: { qwerty: 58.3, colemak: 68.7, optimized: 72.3 }, unit: '' },
    { name: 'Same-Finger Rate', values: { qwerty: 5.2, colemak: 2.8, optimized: 1.8 }, unit: '%' },
    { name: 'Hand Alternation', values: { qwerty: 42.1, colemak: 46.3, optimized: 52.3 }, unit: '%' },
    { name: 'Home Row Usage', values: { qwerty: 32.5, colemak: 74.2, optimized: 68.4 }, unit: '%' },
    { name: 'Inward Roll Rate', values: { qwerty: 18.4, colemak: 32.1, optimized: 38.7 }, unit: '%' },
    { name: 'Fatigue Score', values: { qwerty: 0.031, colemak: 0.024, optimized: 0.020 }, unit: '' },
  ],
};

export const mockFinalAnalysis = {
  selectedLayout: {
    name: 'Personal Optimized v3',
    totalCost: 41.89,
    improvement: 20.0,
    predictedWpm: 72,
    optimizationTime: '2h 34m',
    layout: ['Q', 'W', 'F', 'P', 'G', 'J', 'L', 'U', 'Y', ';', 'A', 'R', 'S', 'T', 'D', 'M', 'N', 'E', 'I', 'O', 'Z', 'X', 'C', 'V', 'B', 'K'],
    fingerMap: ['L.Pinky', 'L.Ring', 'L.Mid', 'L.Index', 'L.Index', 'R.Index', 'R.Index', 'R.Mid', 'R.Ring', 'R.Pinky',
                'L.Pinky', 'L.Ring', 'L.Mid', 'L.Index', 'L.Index', 'R.Index', 'R.Index', 'R.Mid', 'R.Ring', 'R.Pinky',
                'L.Pinky', 'L.Ring', 'L.Mid', 'L.Index', 'L.Index', 'R.Index'],
  },
  fingerColors: {
    'L.Pinky': '#e91e63',
    'L.Ring': '#9c27b0',
    'L.Mid': '#673ab7',
    'L.Index': '#3f51b5',
    'R.Index': '#2196f3',
    'R.Mid': '#00bcd4',
    'R.Ring': '#009688',
    'R.Pinky': '#4caf50',
  },
  improvements: {
    predictedWpm: 24.0,
    sameFingerRate: -65.4,
    fatigueScore: -36.5,
    homeRowUsage: 110.5,
    inwardRolls: 42.3,
  },
  bestBigrams: [
    { bigram: 'TH', cost: 48, frequency: 0.0356 },
    { bigram: 'HE', cost: 52, frequency: 0.0337 },
    { bigram: 'IN', cost: 55, frequency: 0.0287 },
    { bigram: 'ER', cost: 58, frequency: 0.0271 },
    { bigram: 'AN', cost: 61, frequency: 0.0199 },
  ],
  worstBigrams: [
    { bigram: 'QZ', cost: 312, frequency: 0.0001 },
    { bigram: 'XJ', cost: 298, frequency: 0.0002 },
    { bigram: 'ZX', cost: 287, frequency: 0.0001 },
  ],
  recommendations: [
    { title: 'Practice E Position', description: 'Focus on building muscle memory for the new E position (moved from QWERTY)', priority: 'high' },
    { title: 'High-Frequency Bigrams', description: 'Practice TH, HE, AN, IN first - these account for 12% of all typing', priority: 'high' },
    { title: 'D-G Swap Adaptation', description: 'The D and G swap will feel natural after 1 week', priority: 'medium' },
    { title: 'Adaptation Period', description: 'Expected 2-4 weeks to regain speed, full benefits after 6-8 weeks', priority: 'low' },
  ],
  trainingStats: {
    totalSamples: 12847,
    trainingTime: '2h 34m',
    iterations: 100000,
    finalTemperature: 0.0001,
    convergenceEpoch: 78432,
    modelR2: 0.71,
  },
};

export default {
  mockWeek0Validation,
  mockModelTraining,
  mockCostMatrix,
  mockLayoutOptimizer,
  mockLayoutComparison,
  mockFinalAnalysis,
};
