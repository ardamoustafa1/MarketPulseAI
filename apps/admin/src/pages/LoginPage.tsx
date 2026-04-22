import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const success = await login(email, password);
    setIsSubmitting(false);

    if (!success) {
      setError('Invalid admin credentials.');
      return;
    }

    navigate('/dashboard');
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>MarketPulse Admin</h1>
        <p>Secure control panel for market intelligence operations.</p>

        <label>
          Admin Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@marketpulse.ai"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign in to admin'}
        </button>
      </form>
    </div>
  );
}
