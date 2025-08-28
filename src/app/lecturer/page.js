'use client';
import { useState, useEffect } from 'react';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebaseConfig';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebaseConfig';
import { QrCode, FileText } from 'lucide-react';

export default function LecturerDashboard() {
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

    const attendanceQuery = query(
      collection(db, 'attendance'),
      where("lecturerId", "==", currentUser.uid),
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  if (loading || loadingRecords) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-500 text-lg">Loading Lecturer Dashboard...</p>
      </div>
    );
  }

  return (
    <ProtectedRouter allowedRoles={['lecturer']}>
      <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-6">

          {/* Top Welcome Card */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Welcome {currentUser?.displayName || currentUser?.email?.split('@')[0]} 👋
              </h1>
              <p className="text-sm opacity-90 mt-1">Ready to manage your sessions?</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md">
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
              onClick={() => router.push('/lecturer/qr-generator')}
            >
              <FileText className="h-10 w-10 text-teal-600 mb-2" />
              <p className="font-semibold text-gray-700">Create QR Session</p>
            </div>
            <div
              className="bg-white p-6 rounded-2xl shadow-md flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition"
              onClick={() => router.push('/lecturer/history')}
            >
              <FileText className="h-10 w-10 text-teal-600 mb-2" />
              <p className="font-semibold text-gray-700">View History</p>
            </div>
          </div>

          {/* Attendance Records */}
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Class Attendance Records</h2>
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
                <table className="min-w-full bg-white text-sm sm:text-base">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold text-gray-700">Student Name</th>
                      <th className="py-3 px-4 text-left font-semibold text-gray-700">Matric No.</th>
                      <th className="py-3 px-4 text-left font-semibold text-gray-700">Email</th>
                      <th className="py-3 px-4 text-left font-semibold text-gray-700">Course</th>
                      <th className="py-3 px-4 text-left font-semibold text-gray-700">Marked On</th>
                      <th className="py-3 px-4 text-left font-semibold text-gray-700">Session ID</th>
                    </tr>
                  </thead>
                  <tbody>
                   {attendanceRecords.map((record, index) => (
                      <tr
                        key={index}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50 transition`}
                      >
                        <td className="py-2 px-4 text-gray-600">{record.studentName || 'N/A'}</td>
                        <td className="py-2 px-4 text-gray-600">{record.matricNo || 'N/A'}</td>
                        <td className="py-2 px-4 text-gray-600">{record.studentEmail || 'N/A'}</td>
                        <td className="py-2 px-4 text-gray-600">{record.courseName}</td>
                        <td className="py-2 px-4 text-gray-600">
                          {record.timestamp ? record.timestamp.toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2 px-4 text-gray-600 truncate max-w-[150px]">{record.sessionId || 'N/A'}</td>
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