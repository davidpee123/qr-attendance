'use client';

import { useState, useEffect } from 'react';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebaseConfig';
import { getDoc, doc } from 'firebase/firestore';

export default function StudentDashboard() {
  const { currentUser, role, loading } = useAuth();
  const [attendedSessions, setAttendedSessions] = useState([]);
  const [studentEmail, setStudentEmail] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    
    // Set student's email from the current user
    setStudentEmail(currentUser.email);

    // Fetch attended sessions in real-time
    const q = query(
      collection(db, "attendance_records"),
      where("studentId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const records = [];
      const sessionIds = new Set();
      querySnapshot.forEach((doc) => {
        const record = doc.data();
        if (!sessionIds.has(record.sessionId)) {
          records.push(record);
          sessionIds.add(record.sessionId);
        }
      });
      
      // Fetch session details for each unique record
      const sessionsWithDetails = await Promise.all(records.map(async (record) => {
          const sessionDocRef = doc(db, 'qr_sessions', record.sessionId);
          const sessionDoc = await getDoc(sessionDocRef);
          if (sessionDoc.exists()) {
              const sessionData = sessionDoc.data();
              return {
                  id: record.sessionId,
                  courseName: sessionData.courseName,
                  timestamp: record.timestamp.toDate(),
              };
          }
          return null;
      }));

      // Filter out any sessions that don't exist
      const filteredSessions = sessionsWithDetails.filter(session => session !== null);
      setAttendedSessions(filteredSessions.sort((a, b) => b.timestamp - a.timestamp));
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-500 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <ProtectedRouter allowedRoles={['student']}>
      <div className="p-6">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold text-indigo-800 mb-2">Student Dashboard</h1>
          <p className="text-lg text-gray-700 mb-6">Welcome, {studentEmail}!</p>
          
          <h2 className="text-2xl font-semibold mb-4">Your Recent Attendance</h2>

          {attendedSessions.length === 0 ? (
            <p className="text-gray-500">You have no attendance records yet.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendedSessions.map((session, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">{session.courseName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{session.timestamp.toLocaleString()}</td>
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