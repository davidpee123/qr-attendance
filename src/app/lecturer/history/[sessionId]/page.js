'use client';

import { useState, useEffect } from 'react';
import { doc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebaseConfig';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function SessionDetailsPage({ params }) {
  const { sessionId } = params;
  const { currentUser, role, loading } = useAuth();
  const [session, setSession] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!sessionId) return;

    const fetchSessionData = async () => {
      setIsFetching(true);
      try {
        // Fetch session details
        const sessionRef = doc(db, 'qr_sessions', sessionId);
        const sessionDoc = await getDoc(sessionRef);
        setSession(sessionDoc.data());

        // Fetch attendance records for this session
        const q = query(collection(db, 'attendance_records'), where('sessionId', '==', sessionId));
        const querySnapshot = await getDocs(q);
        const records = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp.toDate(),
        }));
        setAttendance(records.sort((a, b) => a.timestamp - b.timestamp));
      } catch (error) {
        console.error("Error fetching session details:", error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchSessionData();
  }, [sessionId]);

  if (loading || isFetching) {
    return <p>Loading session details...</p>;
  }

  if (!session) {
    return <p>Session not found.</p>;
  }

  return (
    <ProtectedRouter allowedRoles={['lecturer']}>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Session Details: {session.courseName}</h1>
        <p className="text-gray-600 mb-6">
          Created on: {session.timestamp.toLocaleString()}
        </p>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">Attendance Records ({attendance.length})</h2>
          {attendance.length === 0 ? (
            <p>No students have signed in for this session yet.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendance.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{record.studentEmail}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{record.timestamp.toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ProtectedRouter>
  );
}