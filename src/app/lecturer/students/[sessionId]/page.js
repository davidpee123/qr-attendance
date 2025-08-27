'use client';
import { useState, useEffect } from 'react';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/firebaseConfig';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { useRouter, useParams } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebaseConfig';
import { ArrowLeft, LogOut } from "lucide-react"; 

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
  }, [currentUser, sessionId]);

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
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-indigo-50 to-indigo-100">
        <p className="text-indigo-600 text-xl font-semibold animate-pulse">
          Loading Student Attendance...
        </p>
      </div>
    );
  }

  return (
    <ProtectedRouter allowedRoles={['lecturer']}>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100 flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl w-full max-w-5xl border border-gray-200">
          <h1 className="text-4xl font-extrabold text-indigo-800 mb-4 text-center">
            Student Attendance Records
          </h1>
          <p className="text-gray-600 text-center mb-6">
            Viewing records for <span className="font-bold text-indigo-700">Session ID: {sessionId}</span>
          </p>

          {/* Buttons */}
          <div className="flex justify-center mb-8 space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 transition duration-300 shadow-sm"
            >
              <ArrowLeft size={18} /> Back
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-300 shadow-sm"
            >
              <LogOut size={18} /> Log Out
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg text-center mb-4 font-medium border border-red-300">
              {error}
            </div>
          )}

          {/* Empty state */}
          {students.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">🚫 No students have marked attendance for this session yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200">
              <table className="min-w-full bg-white rounded-xl overflow-hidden">
                <thead className="bg-indigo-100">
                  <tr>
                    <th className="py-3 px-6 text-left text-sm font-semibold text-indigo-800">Student Email</th>
                    <th className="py-3 px-6 text-left text-sm font-semibold text-indigo-800">Marked At</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr
                      key={student.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50 hover:bg-indigo-50 transition"}
                    >
                      <td className="py-3 px-6 text-sm text-gray-700">{student.studentEmail}</td>
                      <td className="py-3 px-6 text-sm text-gray-600">
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
