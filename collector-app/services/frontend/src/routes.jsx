/**
 * Application routes configuration.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import TypingPage from './pages/TypingPage';
import ReviewPage from './pages/ReviewPage';
import StatsPage from './pages/StatsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TypingPage />} />
      <Route path="/review/:sessionId" element={<ReviewPage />} />
      <Route path="/stats" element={<StatsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
