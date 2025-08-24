'use client';
import { useState, useEffect } from 'react';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import { collectionGroup, query, where, onSnapshot, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebaseConfig';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebaseConfig';

export default function StudentDashboard() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [attendedSessions, setAttendedSessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!currentUser) {
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);
    
    // Use a Collection Group Query to search all 'students' subcollections
    const attendanceQuery = query(
      collectionGroup(db, 'students'),
      where("id", "==", currentUser.uid), // Filter by the student's UID
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(attendanceQuery, async (querySnapshot) => {
      try {
        const recordsPromises = querySnapshot.docs.map(async (recordDoc) => {
          const recordData = recordDoc.data();
          const sessionId = recordDoc.ref.parent.parent.id; // Get the Session ID from the parent document path
          
          // Fetch the course name from the QR sessions collection
          const sessionDocRef = doc(db, 'qr_sessions', sessionId);
          const sessionDoc = await getDoc(sessionDocRef);
          
          const courseName = sessionDoc.exists() ? sessionDoc.data().courseName : 'Unknown Course';
          
          return {
            id: recordDoc.id,
            courseName,
            timestamp: recordData.timestamp ? recordData.timestamp.toDate() : null,
          };
        });
        
        const records = await Promise.all(recordsPromises);
        setAttendedSessions(records.filter(r => r.timestamp !== null));
        setError(null);
      } catch (err) {
        console.error("Error fetching attendance history:", err);
        setError("Failed to load attendance history.");
      } finally {
        setLoadingHistory(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  if (loading || loadingHistory) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-500 text-lg">Loading Attendance History...</p>
      </div>
    );
  }

  return (
    <ProtectedRouter allowedRoles={['student']}>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-4xl">
          <h1 className="text-4xl font-extrabold text-indigo-800 mb-6 text-center">Student Dashboard</h1>
          <p className="text-gray-700 text-center mb-8">Welcome, {currentUser?.email}!</p>
          
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-300"
          >
            Log Out
          </button>

          <div className="mt-10">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Attendance Records</h2>
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-4">
                {error}
              </div>
            )}
            {attendedSessions.length === 0 ? (
              <p className="text-gray-500 text-center">You have no attendance records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendedSessions.map((session, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">{session.courseName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{session.timestamp.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRouter>
  );
}