'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRouter from '@/components/ProtectedRouter';
import { db } from '@/lib/firebase/firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  runTransaction
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebaseConfig';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LecturerDashboard() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [qrSessions, setQrSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState(null);
  const [lecturerName, setLecturerName] = useState('Lecturer');

  const getStudentCount = async (sessionId) => {
    const studentsRef = collection(db, `attendance/${sessionId}/students`);
    const studentSnapshot = await getDocs(studentsRef);
    return studentSnapshot.size;
  };

  const fetchQrSessions = async () => {
    if (!currentUser) return;
    setLoadingSessions(true);
    setError(null);
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setLecturerName(userDocSnap.data().name || 'Lecturer');
      }

      const q = query(
        collection(db, 'qr_sessions'),
        where('lecturerId', '==', currentUser.uid),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const sessionPromises = querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const studentCount = await getStudentCount(doc.id);
        return {
          id: doc.id,
          ...data,
          studentCount,
        };
      });
      const sessions = await Promise.all(sessionPromises);
      setQrSessions(sessions);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data.');
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchQrSessions();
    }
  }, [currentUser]);

  const handleClearHistory = async (sessionId) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this session? This action cannot be undone.'
    );
    if (!confirmDelete) return;

    try {
      const sessionRef = doc(db, 'qr_sessions', sessionId);
      const attendanceRef = collection(db, `attendance/${sessionId}/students`);

      await runTransaction(db, async (transaction) => {
        const attendanceSnapshot = await getDocs(attendanceRef);
        attendanceSnapshot.docs.forEach((doc) => {
          transaction.delete(doc.ref);
        });
        transaction.delete(sessionRef);
      });

      alert('Session and attendance records successfully deleted!');
      fetchQrSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
      alert('Failed to delete session: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  if (loading || loadingSessions) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-500 text-lg">Loading Lecturer Dashboard...</p>
      </div>
    );
  }

  return (
    <ProtectedRouter allowedRoles={['lecturer']}>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-4xl">
          <h1 className="text-4xl font-extrabold text-indigo-800 mb-6 text-center">Lecturer Dashboard</h1>
          <p className="text-gray-700 text-center mb-8">Welcome, {lecturerName}!</p>

          <div className="flex justify-center mb-8 space-x-4">
            <Link
              href="/lecturer/qr-generator"
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-300"
            >
              Generate New QR Code
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-300"
            >
              Log Out
            </button>
          </div>

          <div className="mt-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">QR Session History</h2>
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-4">
                {error}
              </div>
            )}
            {qrSessions.length === 0 ? (
              <p className="text-gray-500 text-center">No QR sessions found. Generate a new one to start tracking attendance.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border-collapse border border-gray-300">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="py-2 px-4 border border-gray-300 text-left text-sm font-semibold text-gray-700">Course</th>
                      <th className="py-2 px-4 border border-gray-300 text-left text-sm font-semibold text-gray-700">Session ID</th>
                      <th className="py-2 px-4 border border-gray-300 text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="py-2 px-4 border border-gray-300 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="py-2 px-4 border border-gray-300 text-left text-sm font-semibold text-gray-700">Attendance Count</th>
                      <th className="py-2 px-4 border border-gray-300 text-left text-sm font-semibold text-gray-700">Actions</th>
                      <th className="py-2 px-4 border border-gray-300 text-left text-sm font-semibold text-gray-700">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qrSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="py-2 px-4 border border-gray-300 text-sm text-gray-600">{session.courseName}</td>
                        <td className="py-2 px-4 border border-gray-300 text-sm text-gray-600 truncate max-w-xs">{session.id}</td>
                        <td className="py-2 px-4 border border-gray-300 text-sm text-gray-600">
                          {session.timestamp ? session.timestamp.toDate().toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2 px-4 border border-gray-300 text-sm text-gray-600">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${session.active ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                            {session.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-2 px-4 border border-gray-300 text-sm text-gray-600 text-center">
                          {session.studentCount}
                        </td>
                        <td className="py-2 px-4 border border-gray-300 text-sm">
                          <button
                            onClick={() => handleClearHistory(session.id)}
                            className="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400"
                          >
                            Delete
                          </button>
                        </td>
                        <td className="py-2 px-4 border border-gray-300 text-sm">
                           <Link href={`/lecturer/students/${session.id}`} passHref>
                              <button
                                className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                              >
                                View Students
                              </button>
                            </Link>
                        </td>
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