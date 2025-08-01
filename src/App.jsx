import React, { useState, useEffect, useCallback, useRef } from 'react';
// Import Firebase Auth and Firestore functions
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, where, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
// Import initialized Firebase instances from the external file
import { auth, db, initializeAuth } from './firebase';

import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';
import StudyPlanner from './components/StudyPlanner';

// Main App component
const App = () => {
  // State for dark mode
  const [isDarkMode, setIsDarkMode] = useState(true);
  // State for Firebase authentication readiness
  const [isAuthReady, setIsAuthReady] = useState(false);
  // State for Firebase user ID
  const [userId, setUserId] = useState(null);
  // State for displaying username in the navbar
  const [displayedUsername, setDisplayedUsername] = useState('Guest');
  // State to manage current page for navigation
  const [currentPage, setCurrentPage] = useState('dashboard'); // Default to dashboard
  // State for global in-app notifications
  const [notification, setNotification] = useState(null); // { message: '...', type: 'success' | 'error' | 'info' }
  // State for account dropdown menu visibility
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  // State to control visibility of the authentication modal
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Ref for the account menu to detect clicks outside
  const accountMenuRef = useRef(null);

  // Toggle dark/light mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Apply theme classes to the documentElement (html tag)
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Firebase Authentication Listener
  useEffect(() => {
    // Call the external initialization function once
    initializeAuth();

    // Set up the authentication state change listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        // Set displayed username from Firebase Auth profile or fallback to email
        setDisplayedUsername(user.displayName || user.email || 'User');
        setShowAuthModal(false); // Hide auth modal if user logs in
      } else {
        setUserId(null); // Ensure userId is null
        setDisplayedUsername('Guest'); // Reset username display
        setShowAuthModal(true); // Show auth modal if no user is logged in
      }
      setIsAuthReady(true); // Mark authentication as ready
    });

    // Clean up the authentication listener when the component unmounts
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this effect runs only once on mount

  // Function to show a temporary notification
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000); // Notification disappears after 5 seconds
    return () => clearTimeout(timer); // Cleanup timeout
  }, []);

  // Handle email/password login
  const handleLogin = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showNotification('Logged in successfully!', 'success');
      // Username will be updated by onAuthStateChanged listener
      setShowAuthModal(false); // Close modal on successful login
    } catch (error) {
      console.error("Error logging in:", error);
      showNotification(`Login failed: ${error.message}`, 'error');
      throw error; // Re-throw to allow AuthModal to handle loading state
    }
  };

  // Handle email/password signup
  const handleSignup = async (email, password, username) => { // Added username parameter
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update Firebase Auth profile with display name (username)
      await updateProfile(user, { displayName: username });

      // Store additional user data (like username) in Firestore
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const userDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/user_data/profile`);
      await setDoc(userDocRef, {
        username: username,
        email: email,
        created_at: new Date().toISOString()
      }, { merge: true }); // Use merge:true to avoid overwriting other fields if they exist

      showNotification('Account created and logged in successfully!', 'success');
      // Username will be updated by onAuthStateChanged listener
      setShowAuthModal(false); // Close modal on successful signup
    } catch (error) {
      console.error("Error signing up:", error);
      showNotification(`Signup failed: ${error.message}`, 'error');
      throw error; // Re-throw to allow AuthModal to handle loading state
    }
  };

  // Handle password reset
  const handlePasswordReset = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      showNotification('If an account with that email exists, a password reset link has been sent!', 'success');
    } catch (error) {
      console.error("Error sending password reset email:", error);
      showNotification(`Password reset failed: ${error.message}`, 'error');
      throw error; // Re-throw to allow AuthModal to handle loading state
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserId(null); // Clear user ID on logout
      setDisplayedUsername('Guest'); // Reset username display
      setNotification('You have been logged out.', 'info');
      setAccountMenuOpen(false); // Close menu after logout
      setShowAuthModal(true); // Show auth modal after logout
    } catch (error) {
      console.error("Error logging out:", error);
      setNotification(`Error logging out: ${error.message}`, 'error');
    }
  };

  // Close account menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  // Effect to dynamically load the AI agent script
  useEffect(() => {
    // Define the tovaAsyncInit function globally before the script loads
    window.tovaAsyncInit = function() {
      if (window.tova) { // Ensure tova is available
        window.tova.init({
          tenant_id: "01JYR1FT1P8567X68CCJPTJW0S",
          bot_code: "01JYVHTYZD6SKV2FCDHYB0NZ5P",
          ui_config: {
            position: "right",
            hide_greeting: false
          },
          extra: {}
        });
        console.log("AI Agent initialized successfully.");
      } else {
        console.error("Tova SDK not available after script load.");
      }
    };

    const scriptId = "tova-jssdk";
    if (document.getElementById(scriptId)) {
      // If script already exists, re-initialize if tova is ready
      if (window.tova && window.tova.init) {
        window.tovaAsyncInit();
      }
      return;
    }

    // Create the script element
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = "https://agents.fpt.ai/connect/sdk.js";
    script.async = true; // Load asynchronously
    script.onload = window.tovaAsyncInit; // Call the init function when script loads

    // Append the script to the body
    document.body.appendChild(script);

    // Cleanup function: remove the script if the component unmounts
    return () => {
      if (document.getElementById(scriptId)) {
        document.body.removeChild(document.getElementById(scriptId));
        // Optionally, clean up global tova object if necessary, though usually not needed for SDKs
        if (window.tova) {
          // window.tova.destroy(); // If the SDK has a destroy method
          delete window.tova;
        }
        delete window.tovaAsyncInit;
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount


  // Define common navigation button styles
  const navButtonStyle = (pageName) => `
    px-4 py-2 rounded-md font-semibold text-lg
    ${isDarkMode ? 'text-nord4 hover:bg-nord3' : 'text-nord0 hover:bg-nord4'}
    ${currentPage === pageName ? (isDarkMode ? 'bg-nord3 text-nord8' : 'bg-nord4 text-nord9') : ''}
    transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
    ${isDarkMode ? 'focus:ring-nord9 focus:ring-offset-nord0' : 'focus:ring-nord8 focus:ring-offset-nord6'}
  `;

  // Define common dropdown item styles
  const dropdownItemStyle = `
    flex items-center w-full text-left px-4 py-2 text-sm rounded-md
    ${isDarkMode ? 'text-nord4 hover:bg-nord3' : 'text-nord0 hover:bg-nord4'}
    transition-colors duration-200
  `;

  return (
    <div className={`min-h-screen flex flex-col items-center p-4 transition-colors duration-300 relative
                    ${isDarkMode ? 'bg-nord0 text-nord4' : 'bg-nord6 text-nord0'}`}>
      {/* Global Notification Display */}
      {notification && (
        <div className={`fixed top-0 left-0 right-0 p-4 text-center z-50
                        ${notification.type === 'success' ? 'bg-nord7 text-nord0' : notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-nord8 text-nord0'}
                        shadow-lg transition-all duration-300 ease-in-out transform
                        ${notification ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
          {notification.message}
        </div>
      )}

      {/* Main application title */}
      <h1 className={`text-4xl font-bold mt-8 mb-4
                      ${isDarkMode ? 'text-nord8' : 'text-nord9'}`}>
        Study Navigator
      </h1>

      {/* Navigation Bar - Only show if authenticated */}
      {userId && (
        <nav className={`w-full max-w-4xl mx-auto flex justify-between items-center p-4 rounded-lg shadow-md mb-8
                         ${isDarkMode ? 'bg-nord2' : 'bg-nord5'}`}>
          {/* Left-aligned navigation buttons */}
          <div className="flex gap-4">
            <button onClick={() => setCurrentPage('dashboard')} className={navButtonStyle('dashboard')}>
              Dashboard
            </button>
            <button onClick={() => setCurrentPage('planner')} className={navButtonStyle('planner')}>
              Study Planner
            </button>
          </div>

          {/* Right-aligned Account/Theme Toggle */}
          <div className="relative flex items-center gap-2" ref={accountMenuRef}>
            {/* Display Username */}
            <span className={`text-lg font-semibold
                              ${isDarkMode ? 'text-nord4' : 'text-nord0'}
                              hidden sm:inline`}> {/* Hide on small screens to save space */}
              {displayedUsername}
            </span>
            <button
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              className={`p-2 rounded-full shadow-lg
                          ${isDarkMode ? 'bg-nord9 text-nord4 hover:bg-nord10' : 'bg-nord8 text-nord0 hover:bg-nord9'}
                          transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2
                          ${isDarkMode ? 'focus:ring-nord9 focus:ring-offset-nord0' : 'focus:ring-nord8 focus:ring-offset-nord6'}`}
              title="Account Menu"
            >
              {/* User icon */}
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>

            {accountMenuOpen && (
              <div className={`absolute top-full right-0 mt-2 w-48 rounded-lg shadow-lg py-1 z-10
                ${isDarkMode ? 'bg-nord1 border border-nord3' : 'bg-nord6 border border-nord4'}`}>
                <button onClick={toggleDarkMode} className={dropdownItemStyle}>
                  {isDarkMode ? (
                    <>
                      <svg className="h-5 w-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h1M3 12H2m15.325-4.575l.707-.707M5.636 18.364l-.707.707M18.364 5.636l.707-.707M5.636 5.636l-.707-.707M12 18a6 6 0 100-12 6 6 0 000 12z" />
                      </svg>
                      Light Mode
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      Dark Mode
                    </>
                  )}
                </button>
                <button onClick={() => { setAccountMenuOpen(false); showNotification('Settings not implemented yet.', 'info'); }} className={dropdownItemStyle}>
                  <svg className="h-5 w-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <button onClick={handleLogout} className={dropdownItemStyle}>
                  <svg className="h-5 w-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </nav>
      )}

      {/* Main content or Auth Modal */}
      {isAuthReady ? (
        userId ? ( // If authenticated, show dashboard or planner
          <>
            {currentPage === 'dashboard' && (
              <Dashboard isDarkMode={isDarkMode} userId={userId} db={db} showNotification={showNotification} />
            )}
            {currentPage === 'planner' && (
              <StudyPlanner isDarkMode={isDarkMode} userId={userId} db={db} showNotification={showNotification} />
            )}
          </>
        ) : ( // If not authenticated, show AuthModal
          <AuthModal
            isDarkMode={isDarkMode}
            showModal={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onLogin={handleLogin}
            onSignup={handleSignup}
            onPasswordReset={handlePasswordReset} // Pass the new function
            showNotification={showNotification}
          />
        )
      ) : (
        // Loading message while Firebase initializes
        <div className={`p-4 rounded-lg shadow-xl ${isDarkMode ? 'bg-nord2' : 'bg-nord5'} text-center`}>
          <p className={`${isDarkMode ? 'text-nord4' : 'text-nord0'}`}>Initializing application...</p>
        </div>
      )}

      {/* Credit Section - positioned at the bottom */}
      <div className={`absolute bottom-4 left-0 right-0 text-center text-sm italic font-serif opacity-0 animate-fade-in
                      ${isDarkMode ? 'text-nord3' : 'text-nord4'}`}>
        <p>Created by I am Groot</p>
      </div>
    </div>
  );
};

export default App;
