import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore'; // Import Firestore functions

// Dashboard Component - Displays statistics and user ID
const Dashboard = ({ isDarkMode, userId, db, showNotification }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch plans for statistics
  useEffect(() => {
    if (!userId || !db) return;

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
      console.error("Error fetching dashboard plans:", error);
      showNotification(`Error loading dashboard data: ${error.message}`, 'error');
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, [userId, db, showNotification]);

  const totalPlans = plans.length;
  const upcomingPlans = plans.filter(plan => {
    const startTime = new Date(plan.start_time);
    return startTime > new Date(); // Plans starting in the future
  }).length;

  return (
    <div className={`w-full max-w-4xl mx-auto p-6 rounded-lg shadow-xl text-center
                    ${isDarkMode ? 'bg-nord2' : 'bg-nord5'}`}>
      <h2 className={`text-3xl font-semibold mb-4
                      ${isDarkMode ? 'text-nord8' : 'text-nord9'}`}>
        Welcome to Study Navigator!
      </h2>
      <p className={`${isDarkMode ? 'text-nord4' : 'text-nord0'} text-lg mb-4`}>
        This is where you can see an overview of your study progress, upcoming tasks, and more.
      </p>

      {loading ? (
        <p className={`${isDarkMode ? 'text-nord4' : 'text-nord0'}`}>Loading statistics...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className={`p-4 rounded-lg shadow-md
                          ${isDarkMode ? 'bg-nord1' : 'bg-nord4'}`}>
            <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-nord7' : 'text-nord10'}`}>
              {totalPlans}
            </h3>
            <p className={`${isDarkMode ? 'text-nord4' : 'text-nord0'}`}>Total Plans</p>
          </div>
          <div className={`p-4 rounded-lg shadow-md
                          ${isDarkMode ? 'bg-nord1' : 'bg-nord4'}`}>
            <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-nord7' : 'text-nord10'}`}>
              {upcomingPlans}
            </h3>
            <p className={`${isDarkMode ? 'text-nord4' : 'text-nord0'}`}>Upcoming Plans</p>
          </div>
        </div>
      )}

      {userId && (
        <p className={`${isDarkMode ? 'text-nord3' : 'text-nord2'} text-sm mt-6`}>
          Your User ID: {userId}
        </p>
      )}
      <p className={`${isDarkMode ? 'text-nord4' : 'text-nord0'} mt-4`}>
        Navigate to "Study Planner" to manage your plans.
      </p>
    </div>
  );
};

export default Dashboard;