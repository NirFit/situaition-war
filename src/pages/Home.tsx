import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Home() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate('/circles', { replace: true });
      return;
    }
    navigate('/login', { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="page home">
      <p className="loading">טוען...</p>
    </div>
  );
}
