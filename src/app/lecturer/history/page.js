'use client';
import { useState, useEffect } from 'react';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'; 
import { db } from '@/lib/firebase/firebaseConfig';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function LecturerHistoryPage() {
  const { currentUser, role, loading } = useAuth();
  const router = useRouter();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser || role !== 'lecturer') {
      setLoadingRecords(false);
      return;
    }

    setLoadingRecords(true);

    // CRITICAL CHANGE: Query the 'attendance' collection directly
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where("lecturerId", "==", currentUser.uid), // Match the field name from your scan code
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(attendanceQuery, (querySnapshot) => {
      try {
        const records = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            studentName: data.studentName || 'Unknown Student',
            courseName: data.courseName || 'Unknown Course',
            timestamp: data.timestamp ? data.timestamp.toDate() : null,
          };
        });
        setAttendanceRecords(records.filter(r => r.timestamp !== null));
        setError(null);
      } catch (err) {
        console.error("Error fetching attendance history:", err);
        setError("Failed to load attendance history.");
      } finally {
        setLoadingRecords(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser, role]);

  if (loading || loadingRecords) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-500 text-lg">Loading History...</p>
      </div>
    );
  }

  return (
    <ProtectedRouter allowedRoles={['lecturer']}>
      <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-6">

          {/* Header with Back Button */}
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-gray-800">Attendance History</h1>
          </div>
          
          {/* Attendance Records Card */}
          <div className="bg-white p-6 rounded-2xl shadow-md">
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-4">
                {error}
              </div>
            )}
            {attendanceRecords.length === 0 ? (
              <div className="flex flex-col items-center text-gray-500 py-10">
                <p>No attendance records found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceRecords.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.studentName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.courseName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.timestamp.toLocaleString()}</td>
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