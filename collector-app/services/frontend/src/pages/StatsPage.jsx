/**
 * Stats page - statistics and database view.
 */

import { useNavigate } from 'react-router-dom';
import StatsView from '../components/StatsView';

export function StatsPage() {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/');
  };

  return <StatsView onClose={handleClose} />;
}

export default StatsPage;
