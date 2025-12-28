/**
 * Main application component with routing.
 */

import { ErrorBoundary } from './components/common';
import AppRoutes from './routes';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
}

export default App;
