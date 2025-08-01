import React, { useState, useEffect } from 'react';

// AuthModal Component - Handles Login and Signup forms
const AuthModal = ({ isDarkMode, showModal, onClose, onLogin, onSignup, onPasswordReset, showNotification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true); // true for login, false for signup
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false); // State for animation control
  const [showForgotPassword, setShowForgotPassword] = useState(false); // New state for forgot password view

  // Clear form fields when modal opens or mode changes
  useEffect(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setShowForgotPassword(false); // Reset forgot password view
    // Reset modal visibility when showModal changes
    if (showModal) {
      // Set a small timeout to allow CSS transitions to apply
      setTimeout(() => setModalVisible(true), 10);
    } else {
      setModalVisible(false);
    }
  }, [showModal, isLoginMode]);

  // Handle form submission for either login, signup, or password reset
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (showForgotPassword) {
        await onPasswordReset(email);
        showNotification('Password reset email sent if account exists!', 'success');
        setShowForgotPassword(false); // Go back to login mode after sending email
        setEmail(''); // Clear email field
      } else if (isLoginMode) {
        await onLogin(email, password);
      } else {
        // Validation for signup mode
        if (password !== confirmPassword) {
          showNotification('Passwords do not match!', 'error');
          setLoading(false);
          return;
        }
        if (!username.trim()) {
          showNotification('Username cannot be empty!', 'error');
          setLoading(false);
          return;
        }
        await onSignup(email, password, username); // Pass username to onSignup
      }
      // onClose(); // Close modal on success is handled by App's onAuthStateChanged
    } catch (error) {
      // Error handling is done in App component's onLogin/onSignup/onPasswordReset
    } finally {
      setLoading(false);
    }
  };

  // Do not render the modal if showModal is false
  if (!showModal) return null;

  // Tailwind CSS classes for input fields
  const inputStyle = `w-full p-3 rounded-md border mb-4
                      ${isDarkMode ? 'bg-nord1 border-nord3 text-nord4 placeholder-nord3' : 'bg-nord5 border-nord4 text-nord0 placeholder-nord3'}
                      focus:outline-none focus:ring-2
                      ${isDarkMode ? 'focus:ring-nord9 focus:border-nord9' : 'focus:ring-nord8 focus:border-nord8'}
                      transition-colors duration-200`;

  // Tailwind CSS classes for buttons
  const buttonStyle = `w-full py-3 px-4 rounded-md font-semibold
                       ${isDarkMode ? 'bg-nord9 text-nord4 hover:bg-nord10' : 'bg-nord8 text-nord0 hover:bg-nord9'}
                       transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                       ${isDarkMode ? 'focus:ring-nord9 focus:ring-offset-nord0' : 'focus:ring-nord8 focus:ring-offset-nord6'}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`relative p-8 rounded-lg shadow-xl w-full max-w-md
                      transform transition-all duration-300 ease-out
                      ${modalVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
                      ${isDarkMode ? 'bg-nord2' : 'bg-nord5'}`}>
        <h2 className={`text-3xl font-bold mb-6 text-center
                        ${isDarkMode ? 'text-nord8' : 'text-nord9'}`}>
          {showForgotPassword ? 'Reset Password' : (isLoginMode ? 'Login' : 'Sign Up')}
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputStyle}
            required
          />
          {!showForgotPassword && ( // Hide password fields in forgot password mode
            <>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputStyle}
                required
              />
              {!isLoginMode && ( // Only show these fields in signup mode
                <>
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputStyle}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputStyle}
                    required
                  />
                </>
              )}
            </>
          )}
          <button type="submit" className={buttonStyle} disabled={loading}>
            {loading ? (showForgotPassword ? 'Sending...' : (isLoginMode ? 'Logging In...' : 'Signing Up...')) : (showForgotPassword ? 'Send Reset Email' : (isLoginMode ? 'Login' : 'Sign Up'))}
          </button>
        </form>
        <p className={`text-center mt-4 text-sm
                      ${isDarkMode ? 'text-nord4' : 'text-nord0'}`}>
          {showForgotPassword ? (
            <button
              onClick={() => setShowForgotPassword(false)}
              className={`font-semibold
                          ${isDarkMode ? 'text-nord7 hover:text-nord8' : 'text-nord10 hover:text-nord9'}
                          transition-colors duration-200 focus:outline-none`}
            >
              Back to Login
            </button>
          ) : (
            <>
              {isLoginMode ? "Don't have an account?" : "Already have an account?"}{' '}
              <button
                onClick={() => setIsLoginMode(!isLoginMode)}
                className={`font-semibold
                            ${isDarkMode ? 'text-nord7 hover:text-nord8' : 'text-nord10 hover:text-nord9'}
                            transition-colors duration-200 focus:outline-none`}
              >
                {isLoginMode ? 'Sign Up' : 'Login'}
              </button>
              {isLoginMode && ( // Show "Forgot Password?" only in login mode
                <button
                  onClick={() => setShowForgotPassword(true)}
                  className={`block w-full text-center mt-2 text-sm font-semibold
                              ${isDarkMode ? 'text-nord7 hover:text-nord8' : 'text-nord10 hover:text-nord9'}
                              transition-colors duration-200 focus:outline-none`}
                >
                  Forgot Password?
                </button>
              )}
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthModal;