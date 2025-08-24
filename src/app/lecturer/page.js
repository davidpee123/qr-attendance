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

    // Fetch lecturer's name once on load
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

    // Set up real-time listener for attendance records
    setLoadingAttendance(true);
    const sessionsRef = collection(db, 'qr_sessions');
    const q = query(
      sessionsRef,
      where('lecturerId', '==', currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      let allRecords = [];
      const sessions = querySnapshot.docs;

      for (const sessionDoc of sessions) {
        const sessionId = sessionDoc.id;
        const sessionData = sessionDoc.data();
        
        // Fetch all attendance records for this session
        const attendanceRef = collection(db, `attendance/${sessionId}/students`);
        const attendanceQuery = query(attendanceRef, orderBy('timestamp', 'asc'));
        const attendanceSnapshot = await getDocs(attendanceQuery);
        
        const attendancePromises = attendanceSnapshot.docs.map(async (studentDoc) => {
          const studentData = studentDoc.data();
          const studentUid = studentDoc.id; // The doc ID is the student's UID
          
          // Fetch student's name and matric no from the users collection
          const userDocRef = doc(db, 'users', studentUid);
          const userDocSnap = await getDoc(userDocRef);
          const userData = userDocSnap.exists() ? userDocSnap.data() : {};

          return {
            ...studentData,
            ...userData, // Merges user data (name, matricNo) into the record
            courseName: sessionData.courseName,
            sessionId: sessionId,
          };
        });
        const recordsForSession = await Promise.all(attendancePromises);
        allRecords.push(...recordsForSession);
      }
      setAllAttendance(allRecords);
      setLoadingAttendance(false);
    }, (err) => {
      console.error('Failed to listen for attendance updates:', err);
      setError('Failed to load attendance records. Please try again later.');
      setLoadingAttendance(false);
    });

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
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-4xl">
          <h1 className="text-4xl font-extrabold text-indigo-800 mb-6 text-center">Lecturer Dashboard</h1>
          <p className="text-gray-700 text-center mb-8">Welcome, {lecturerName}!</p>

          <div className="flex justify-center mb-8 space-x-4">
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-300"
            >
              Log Out
            </button>
            <button
              onClick={() => router.push('/lecturer/qr-generator')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-300"
            >
              Generate New QR Code
            </button>
          </div>

          <div className="mt-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Live Attendance Records</h2>
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-4">
                {error}
              </div>
            )}
            {allAttendance.length === 0 ? (
              <p className="text-gray-500 text-center">No attendance records found yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border-collapse border border-gray-300">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="py-2 px-4 border border-gray-300 text-left text-sm font-semibold text-gray-700">Student Name</th>
                      <th className="py-2 px-4 border border-gray-300 text-left text-sm font-semibold text-gray-700">Matric No.</th>
                      <th className="py-2 px-4 border border-gray-300 text-left text-sm font-semibold text-gray-700">Student Email</th>
                      <th className="py-2 px-4 border border-gray-300 text-left text-sm font-semibold text-gray-700">Course Name</th>
                      <th className="py-2 px-4 border border-gray-300 text-left text-sm font-semibold text-gray-700">Marked On</th>
                      <th className="py-2 px-4 border border-gray-300 text-left text-sm font-semibold text-gray-700">Session ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAttendance.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-2 px-4 border border-gray-300 text-sm text-gray-600">{record.name || 'N/A'}</td>
                        <td className="py-2 px-4 border border-gray-300 text-sm text-gray-600">{record.matricNo || 'N/A'}</td>
                        <td className="py-2 px-4 border border-gray-300 text-sm text-gray-600">{record.studentEmail}</td>
                        <td className="py-2 px-4 border border-gray-300 text-sm text-gray-600">{record.courseName}</td>
                        <td className="py-2 px-4 border border-gray-300 text-sm text-gray-600">
                          {record.timestamp ? record.timestamp.toDate().toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2 px-4 border border-gray-300 text-sm text-gray-600 truncate max-w-xs">{record.sessionId}</td>
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