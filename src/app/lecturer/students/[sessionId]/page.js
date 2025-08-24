'use client';
import { useState, useEffect } from 'react';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/firebaseConfig';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { useRouter, useParams } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebaseConfig';

export default function StudentAttendancePage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId;

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudentAttendance = async () => {
      // Check if sessionId is available before proceeding
      if (!sessionId || !currentUser) {
        setLoadingStudents(false);
        return;
      }

      setLoadingStudents(true);
      setError(null);
      try {
        const studentsRef = collection(db, `attendance/${sessionId}/students`);
        const q = query(studentsRef, orderBy('timestamp', 'asc'));
        const querySnapshot = await getDocs(q);
        const studentsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStudents(studentsData);
      } catch (err) {
        console.error("Failed to fetch student attendance:", err);
        setError("Failed to load student attendance records.");
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudentAttendance();
  }, [currentUser, sessionId]); // Add sessionId to the dependency array

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  if (loading || loadingStudents) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-500 text-lg">Loading Student Attendance...</p>
      </div>
    );
  }

  return (
    <ProtectedRouter allowedRoles={['lecturer']}>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-4xl">
          <h1 className="text-4xl font-extrabold text-indigo-800 mb-6 text-center">Student Attendance Records</h1>
          <p className="text-gray-700 text-center mb-4">
            Viewing records for Session ID: <span className="font-bold">{sessionId}</span>
          </p>

          <div className="flex justify-center mb-8 space-x-4">
            <button
              onClick={() => router.back()}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition duration-300"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-300"
            >
              Log Out
            </button>
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-4">
              {error}
            </div>
          )}

          {students.length === 0 ? (
            <p className="text-gray-500 text-center">No students have marked attendance for this session yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border-collapse border border-gray-300">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="py-2 px-4 border border-gray-300 text-left text-sm font-semibold text-gray-700">Student Email</th>
                    <th className="py-2 px-4 border border-gray-300 text-left text-sm font-semibold text-gray-700">Marked At</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border border-gray-300 text-sm text-gray-600">{student.studentEmail}</td>
                      <td className="py-2 px-4 border border-gray-300 text-sm text-gray-600">
                        {student.timestamp ? student.timestamp.toDate().toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedRouter>
  );
}