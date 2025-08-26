'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRouter from '@/components/ProtectedRouter';
import { db } from '@/lib/firebase/firebaseConfig';
import {
  collection,
  query,
  where,
  getDoc,
  doc,
  onSnapshot,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebaseConfig';
import { useRouter } from 'next/navigation';

export default function LecturerDashboard() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [allAttendance, setAllAttendance] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [error, setError] = useState(null);
  const [lecturerName, setLecturerName] = useState('Lecturer');

  useEffect(() => {
    if (!currentUser) return;

    // Fetch lecturer's name once
    const fetchLecturerName = async () => {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setLecturerName(userDocSnap.data().name || 'Lecturer');
        }
      } catch (err) {
        console.error('Failed to fetch lecturer name:', err);
      }
    };
    fetchLecturerName();

    // Real-time attendance listener
    setLoadingAttendance(true);
    const sessionsRef = collection(db, 'qr_sessions');
    const q = query(
      sessionsRef,
      where('lecturerId', '==', currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        let allRecords = [];
        const sessions = querySnapshot.docs;

        for (const sessionDoc of sessions) {
          const sessionId = sessionDoc.id;
          const sessionData = sessionDoc.data();

          const attendanceRef = collection(db, `attendance/${sessionId}/students`);
          const attendanceQuery = query(attendanceRef, orderBy('timestamp', 'asc'));
          const attendanceSnapshot = await getDocs(attendanceQuery);

          const attendancePromises = attendanceSnapshot.docs.map(async (studentDoc) => {
            const studentData = studentDoc.data();
            const studentUid = studentDoc.id;

            const userDocRef = doc(db, 'users', studentUid);
            const userDocSnap = await getDoc(userDocRef);
            const userData = userDocSnap.exists() ? userDocSnap.data() : {};

            return {
              ...studentData,
              ...userData,
              courseName: sessionData.courseName,
              sessionId: sessionId,
            };
          });

          const recordsForSession = await Promise.all(attendancePromises);
          allRecords.push(...recordsForSession);
        }
        setAllAttendance(allRecords);
        setLoadingAttendance(false);
      },
      (err) => {
        console.error('Failed to listen for attendance updates:', err);
        setError('Failed to load attendance records. Please try again later.');
        setLoadingAttendance(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  if (loading || loadingAttendance) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-500 text-lg">Loading Lecturer Dashboard...</p>
      </div>
    );
  }

  return (
    <ProtectedRouter allowedRoles={['lecturer']}>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-6xl">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-indigo-800 mb-4 text-center">
            Lecturer Dashboard
          </h1>
          <p className="text-gray-700 text-center mb-8 text-base sm:text-lg">
            Welcome, <span className="font-semibold">{lecturerName}</span> 👋
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row justify-center mb-10 gap-4">
            <button
              onClick={handleLogout}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-300"
            >
              Log Out
            </button>
            <button
              onClick={() => router.push('/lecturer/qr-generator')}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-300"
            >
              Generate New QR Code
            </button>
          </div>

          {/* Attendance Records */}
          <div className="mt-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
              Live Attendance Records
            </h2>
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-4">
                {error}
              </div>
            )}
            {allAttendance.length === 0 ? (
              <p className="text-gray-500 text-center">No attendance records found yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
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
                    {allAttendance.map((record, index) => (
                      <tr
                        key={index}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50 transition`}
                      >
                        <td className="py-2 px-4 text-gray-600">{record.name || 'N/A'}</td>
                        <td className="py-2 px-4 text-gray-600">{record.matricNo || 'N/A'}</td>
                        <td className="py-2 px-4 text-gray-600">{record.studentEmail}</td>
                        <td className="py-2 px-4 text-gray-600">{record.courseName}</td>
                        <td className="py-2 px-4 text-gray-600">
                          {record.timestamp ? record.timestamp.toDate().toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2 px-4 text-gray-600 truncate max-w-[150px]">{record.sessionId}</td>
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
