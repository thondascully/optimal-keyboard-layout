/**
 * Review page - session review interface.
 */

import { useParams, useNavigate, useLocation } from 'react-router-dom';
import SessionReview from '../components/SessionReview';
import { useSession } from '../hooks/useSession';
import { LoadingSpinner } from '../components/common';

export function ReviewPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Try to get session data from navigation state first (fresh session)
  const passedSessionData = location.state?.sessionData;

  // Fall back to fetching from API if no state passed
  const { session, loading, error } = useSession(
    passedSessionData ? null : sessionId
  );

  const sessionData = passedSessionData || session;

  const handleStartNew = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="app">
        <main className="container">
          <LoadingSpinner message="Loading session..." />
        </main>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="app">
        <main className="container">
          <div className="card">
            <p>{error || 'Session not found'}</p>
            <button onClick={handleStartNew}>Start New Session</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <SessionReview
      sessionData={sessionData}
      onStartNew={handleStartNew}
    />
  );
}

export default ReviewPage;
