import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore'; // Import Firestore functions

// Study Planner Component - Handles form, data fetching, and display
const StudyPlanner = ({ isDarkMode, userId, db, showNotification }) => {
  // State variables for form inputs
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState('');
  // State for fetched study plans
  const [plans, setPlans] = useState([]);
  // State for loading indicators
  const [loading, setLoading] = useState(true); // Set to true initially for real-time fetch
  // State for the plan currently being edited
  const [editingPlan, setEditingPlan] = useState(null); // null or the plan object

  // Function to format datetime for input fields
  const formatDateTimeLocal = (isoString) => {
    if (!isoString) return '';
    const dt = new Date(isoString);
    // Adjust for local timezone offset to display correctly in datetime-local input
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    return dt.toISOString().slice(0, 16);
  };

  // Real-time fetching of study plans using onSnapshot
  useEffect(() => {
    if (!userId || !db) {
      setLoading(false); // Stop loading if Firebase not ready
      return;
    }

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const plansCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/study_plans`);
    const q = query(plansCollectionRef, where("user_id", "==", userId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPlans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlans(fetchedPlans);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching real-time plans:", error);
      showNotification(`Error loading plans: ${error.message}`, 'error');
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on component unmount
  }, [userId, db, showNotification]); // Dependencies for the effect

  // Handle form submission (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!subject || !startTime || !endTime) {
      showNotification('Please fill in all required fields (Subject, Start Time, End Time).', 'error');
      setLoading(false);
      return;
    }

    if (!userId || !db) {
        showNotification('Authentication not ready or Firestore not initialized. Cannot create/update plan.', 'error');
        setLoading(false);
        return;
    }

    const planData = {
      user_id: userId,
      subject,
      topic: topic || null,
      description: description || null,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      reminder_minutes_before: reminderMinutesBefore ? parseInt(reminderMinutesBefore, 10) : null,
    };

    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const plansCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/study_plans`);

      if (editingPlan) {
        // Update existing plan
        const planDocRef = doc(db, plansCollectionRef.path, editingPlan.id);
        await updateDoc(planDocRef, planData);
        showNotification('Study plan updated successfully!', 'success');
        setEditingPlan(null); // Exit edit mode
      } else {
        // Create new plan
        await addDoc(plansCollectionRef, { ...planData, created_at: new Date().toISOString() });
        showNotification('Study plan created successfully!', 'success');
      }

      // Clear form fields after successful submission/update
      setSubject('');
      setTopic('');
      setDescription('');
      setStartTime('');
      setEndTime('');
      setReminderMinutesBefore('');
    } catch (error) {
      console.error("Error saving plan:", error);
      showNotification(`Error saving plan: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle clicking the "Edit" button on a plan card
  const handleEditClick = (plan) => {
    setEditingPlan(plan);
    setSubject(plan.subject);
    setTopic(plan.topic || '');
    setDescription(plan.description || '');
    setStartTime(formatDateTimeLocal(plan.start_time));
    setEndTime(formatDateTimeLocal(plan.end_time));
    setReminderMinutesBefore(plan.reminder_minutes_before || '');
    showNotification(`Editing plan: ${plan.subject}`, 'info'); // Changed to info type
  };

  // Function to handle deleting a plan
  const handleDeletePlan = async (planId, planSubject) => {
    if (!userId || !db) {
      showNotification('Authentication not ready or Firestore not initialized. Cannot delete plan.', 'error');
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete the plan for "${planSubject}"?`);
    if (!confirmDelete) return;

    setLoading(true);
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const plansCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/study_plans`);
      const planDocRef = doc(db, plansCollectionRef.path, planId);
      await deleteDoc(planDocRef);
      showNotification(`Plan "${planSubject}" deleted successfully!`, 'success');
    } catch (error) {
      console.error("Error deleting plan:", error);
      showNotification(`Error deleting plan: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reminder Notification Logic
  useEffect(() => {
    const reminderCheckInterval = setInterval(() => {
      const now = new Date();
      plans.forEach(plan => {
        if (plan.reminder_minutes_before !== null && plan.reminder_minutes_before !== undefined) {
          const startTime = new Date(plan.start_time);
          const reminderTime = new Date(startTime.getTime() - plan.reminder_minutes_before * 60 * 1000);

          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
          if (reminderTime <= now && reminderTime > fiveMinutesAgo && now < startTime) {
            if (!sessionStorage.getItem(`reminded-${plan.id}`)) {
              showNotification(`Reminder: Your "${plan.subject}" session on "${plan.topic || 'N/A'}" starts in ${plan.reminder_minutes_before} minutes!`, 'info');
              sessionStorage.setItem(`reminded-${plan.id}`, 'true'); // Mark as reminded for this session
            }
          }
        }
      });
    }, 60 * 1000); // Check every minute

    return () => clearInterval(reminderCheckInterval); // Cleanup interval
  }, [plans, showNotification]);


  // Define common input styles based on dark/light mode
  const inputStyle = `w-full p-3 rounded-md border
                      ${isDarkMode ? 'bg-nord1 border-nord3 text-nord4 placeholder-nord3' : 'bg-nord5 border-nord4 text-nord0 placeholder-nord3'}
                      focus:outline-none focus:ring-2
                      ${isDarkMode ? 'focus:ring-nord9 focus:border-nord9' : 'focus:ring-nord8 focus:border-nord8'}
                      transition-colors duration-200`;

  // Define common button styles based on dark/light mode
  const buttonStyle = `w-full py-3 px-4 rounded-md font-semibold
                       ${isDarkMode ? 'bg-nord9 text-nord4 hover:bg-nord10' : 'bg-nord8 text-nord0 hover:bg-nord9'}
                       transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                       ${isDarkMode ? 'focus:ring-nord9 focus:ring-offset-nord0' : 'focus:ring-nord8 focus:ring-offset-nord6'}`;

  return (
    <div className={`w-full max-w-4xl mx-auto p-6 rounded-lg shadow-xl
                    ${isDarkMode ? 'bg-nord2' : 'bg-nord5'}`}>
      {/* Section for creating/editing study plans */}
      <h2 className={`text-2xl font-semibold mb-4
                      ${isDarkMode ? 'text-nord8' : 'text-nord9'}`}>
        {editingPlan ? 'Edit Study Plan' : 'Create New Study Plan'}
      </h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Subject input field */}
        <div>
          <label htmlFor="subject" className={`block text-sm font-medium mb-1
                                              ${isDarkMode ? 'text-nord4' : 'text-nord0'}`}>
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputStyle}
            placeholder="e.g., Mathematics"
            required
          />
        </div>
        {/* Topic input field (optional) */}
        <div>
          <label htmlFor="topic" className={`block text-sm font-medium mb-1
                                            ${isDarkMode ? 'text-nord4' : 'text-nord0'}`}>
            Topic (Optional)
          </label>
          <input
            type="text"
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className={inputStyle}
            placeholder="e.g., Algebra Basics"
          />
        </div>
        {/* Description textarea (optional), spans full width on medium screens and up */}
        <div className="md:col-span-2">
          <label htmlFor="description" className={`block text-sm font-medium mb-1
                                                  ${isDarkMode ? 'text-nord4' : 'text-nord0'}`}>
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputStyle} h-24 resize-y`}
            placeholder="e.g., Review chapters 1-3, focus on problem-solving."
          />
        </div>
        {/* Start Time input field */}
        <div>
          <label htmlFor="startTime" className={`block text-sm font-medium mb-1
                                                ${isDarkMode ? 'text-nord4' : 'text-nord0'}`}>
            Start Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            id="startTime"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputStyle}
            required
          />
        </div>
        {/* End Time input field */}
        <div>
          <label htmlFor="endTime" className={`block text-sm font-medium mb-1
                                              ${isDarkMode ? 'text-nord4' : 'text-nord0'}`}>
            End Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            id="endTime"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={inputStyle}
            required
          />
        </div>
        {/* Reminder minutes before input field (optional) */}
        <div>
          <label htmlFor="reminder" className={`block text-sm font-medium mb-1
                                               ${isDarkMode ? 'text-nord4' : 'text-nord0'}`}>
            Reminder (minutes before) (Optional)
          </label>
          <input
            type="number"
            id="reminder"
            value={reminderMinutesBefore}
            onChange={(e) => setReminderMinutesBefore(e.target.value)}
            className={inputStyle}
            placeholder="e.g., 15"
            min="0"
          />
        </div>
        <div className="md:col-span-2 flex gap-4">
          <button type="submit" className={buttonStyle} disabled={loading}>
            {loading ? (editingPlan ? 'Updating...' : 'Creating...') : (editingPlan ? 'Update Plan' : 'Create Plan')}
          </button>
          {editingPlan && (
            <button
              type="button"
              onClick={() => {
                setEditingPlan(null);
                setSubject('');
                setTopic('');
                setDescription('');
                setStartTime('');
                setEndTime('');
                setReminderMinutesBefore('');
                showNotification('Edit cancelled.', 'info');
              }}
              className={`w-full py-3 px-4 rounded-md font-semibold
                         ${isDarkMode ? 'bg-nord3 text-nord4 hover:bg-nord2' : 'bg-nord4 text-nord0 hover:bg-nord3'}
                         transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                         ${isDarkMode ? 'focus:ring-nord9 focus:ring-offset-nord0' : 'focus:ring-nord8 focus:ring-offset-nord6'}`}
              disabled={loading}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {/* Horizontal rule to separate sections */}
      <hr className={`my-8 border-t-2 ${isDarkMode ? 'border-nord3' : 'border-nord4'}`} />

      {/* Section for displaying existing study plans */}
      <h2 className={`text-2xl font-semibold mb-4
                      ${isDarkMode ? 'text-nord8' : 'text-nord9'}`}>
        Your Study Plans
      </h2>

      {/* Loading indicator when fetching plans */}
      {loading && (
        <p className={`${isDarkMode ? 'text-nord4' : 'text-nord0'} text-center`}>
          Loading plans...
        </p>
      )}

      {/* Message when no plans are found */}
      {!loading && plans.length === 0 && (
        <p className={`${isDarkMode ? 'text-nord4' : 'text-nord0'} text-center`}>
          No plans found for this user. Create one above!
        </p>
      )}

      {/* Grid to display study plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id} // Use Firestore document ID as key
            className={`p-4 rounded-lg shadow-md flex flex-col justify-between
                        ${isDarkMode ? 'bg-nord1 border border-nord3' : 'bg-nord4 border border-nord5'}`}
          >
            <div>
              {/* Plan details */}
              <h3 className={`text-xl font-bold mb-2
                              ${isDarkMode ? 'text-nord7' : 'text-nord10'}`}>
                {plan.subject}
              </h3>
              {plan.topic && (
                <p className={`${isDarkMode ? 'text-nord4' : 'text-nord0'} mb-1`}>
                  <span className="font-semibold">Topic:</span> {plan.topic}
                </p>
              )}
              {plan.description && ( // Display description if it exists
                <p className={`${isDarkMode ? 'text-nord4' : 'text-nord0'} text-sm mb-1`}>
                  <span className="font-semibold">Description:</span> {plan.description}
                </p>
              )}
              <p className={`${isDarkMode ? 'text-nord4' : 'text-nord0'} text-sm mb-1`}>
                <span className="font-semibold">Start:</span> {new Date(plan.start_time).toLocaleString()}
              </p>
              <p className={`${isDarkMode ? 'text-nord4' : 'text-nord0'} text-sm mb-1`}>
                <span className="font-semibold">End:</span> {new Date(plan.end_time).toLocaleString()}
              </p>
              {plan.reminder_minutes_before !== null && (
                <p className={`${isDarkMode ? 'text-nord4' : 'text-nord0'} text-sm`}>
                  <span className="font-semibold">Reminder:</span> {plan.reminder_minutes_before} mins before
                </p>
              )}
            </div>
            {/* Footer with Plan ID, User ID, and Action Buttons */}
            <div className="mt-4 pt-4 border-t border-dashed flex justify-between items-center
                            ${isDarkMode ? 'border-nord3' : 'border-nord3'}">
              <p className={`${isDarkMode ? 'text-nord3' : 'text-nord2'} text-xs`}>
                ID: {plan.id}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditClick(plan)}
                  className={`p-2 rounded-full
                              ${isDarkMode ? 'text-nord8 hover:bg-nord3' : 'text-nord9 hover:bg-nord4'}
                              transition-colors duration-200`}
                  title="Edit Plan"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.829z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeletePlan(plan.id, plan.subject)}
                  className={`p-2 rounded-full
                              ${isDarkMode ? 'text-red-400 hover:bg-nord3' : 'text-red-600 hover:bg-nord4'}
                              transition-colors duration-200`}
                  title="Delete Plan"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm6 3a1 1 0 100 2v3a1 1 0 102 0v-3a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudyPlanner;