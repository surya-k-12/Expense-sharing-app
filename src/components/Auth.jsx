import React, { useState } from 'react';
import { authService } from '../services/authService';
import '../styles/Forms.css';

const Auth = ({ onAuthSuccess }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    fullName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;

      if (isSignup) {
        result = await authService.signup(
          formData.email,
          formData.password,
          formData.username,
          formData.fullName
        );
      } else {
        result = await authService.signin(formData.email, formData.password);
      }

      if (result.success) {
        onAuthSuccess(result.user);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>{isSignup ? 'Create Account' : 'Sign In'}</h1>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Your password"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Loading...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="toggle-auth">
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="link-button"
          >
            {isSignup ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
