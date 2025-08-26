
'use client';

import { useState, useEffect } from 'react';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import { collectionGroup, query, where, onSnapshot, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebaseConfig';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebaseConfig';
import { QrCode, FileText } from 'lucide-react'; // Icons
import ImageSlider from '@/components/ImageSlider';

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

    const attendanceQuery = query(
      collectionGroup(db, 'students'),
      where("id", "==", currentUser.uid),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(attendanceQuery, async (querySnapshot) => {
      try {
        const recordsPromises = querySnapshot.docs.map(async (recordDoc) => {
          const recordData = recordDoc.data();
          const sessionId = recordDoc.ref.parent.parent.id;
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

  const handleScanClick = () => {
    router.push('/student/scan');
  };

  const handleHistoryClick = () => {
    router.push('/student/history');
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
      <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
        <div className="w-full max-w-3xl space-y-6">

          {/* Top Welcome Card */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Welcome {currentUser?.displayName || currentUser?.email?.split('@')[0]} 👋
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md"
              >
                Log Out
              </button>
              <div className="h-12 w-12 rounded-full bg-purple-300 flex items-center justify-center text-lg font-bold">
                {currentUser?.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className="bg-white p-6 rounded-2xl shadow-md flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition"
              onClick={handleScanClick}
            >
              <QrCode className="h-10 w-10 text-indigo-600 mb-2" />
              <p className="font-semibold text-gray-700">Scan QR</p>
            </div>
            <div
              className="bg-white p-6 rounded-2xl shadow-md flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition"
              onClick={handleHistoryClick} // Added onClick handler here
            >
              <FileText className="h-10 w-10 text-indigo-600 mb-2" />
              <p className="font-semibold text-gray-700">History</p>
            </div>
          </div>

          {/* Attendance Records */}
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Attendance Records</h2>
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-4">
                {error}
              </div>
            )}
            {attendedSessions.length === 0 ? (
              <div className="flex flex-col items-center text-gray-500 py-10">
                <ImageSlider altText="No attendance records" className="h-24 mb-4" />
                <p>No attendance records yet.</p>
              </div>
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