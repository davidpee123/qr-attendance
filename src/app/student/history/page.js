'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collectionGroup, query, where, onSnapshot, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebaseConfig';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import ImageSlider from '@/components/ImageSlider';

export default function StudentHistoryPage() {
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

  if (loading || loadingHistory) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
        <p className="text-gray-500 text-lg">Loading Attendance History...</p>
      </div>
    );
  }

  return (
    <ProtectedRouter allowedRoles={['student']}>
      <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
        <div className="w-full max-w-3xl space-y-6">

          {/* Header with Back Button */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-200 transition"
              aria-label="Go back"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <h1 className="text-3xl font-bold text-gray-800">Your Attendance History</h1>
          </div>
          
          {/* Attendance Records Card */}
          <div className="bg-white p-6 rounded-2xl shadow-md">
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-4">
                {error}
              </div>
            )}
            {attendedSessions.length === 0 ? (
              <div className="flex flex-col items-center text-gray-500 py-10">
                <ImageSlider altText="No attendance records"  className="h-24 mb-4" />
                <p>No attendance records found.</p>
                <p>Scan a QR code to start tracking your attendance!</p>
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
                      <tr key={index} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{session.courseName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.timestamp.toLocaleString()}</td>
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