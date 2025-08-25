'use client';

import { useState, useEffect } from 'react';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot, writeBatch, doc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebaseConfig';
import Link from 'next/link';

export default function HistoryPage() {
  const { currentUser, role, loading } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "qr_sessions"),
      where("lecturerId", "==", currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allSessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      }));
      setSessions(allSessions.sort((a, b) => b.timestamp - a.timestamp));
    });

    return () => unsubscribe();
  }, [currentUser]);

  const clearHistory = async () => {
    const confirmation = window.confirm("Are you sure you want to permanently delete all attendance history?");
    if (!confirmation) {
      return;
    }

    setIsClearing(true);
    const batch = writeBatch(db);

    try {
      // 1. Delete all attendance records for this lecturer
      const attendanceQuery = query(
        collection(db, 'attendance_records'),
        where('lecturerId', '==', currentUser.uid)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      attendanceSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 2. Delete all QR sessions created by this lecturer
      sessions.forEach((session) => {
        batch.delete(doc(db, 'qr_sessions', session.id));
      });

      await batch.commit();
      alert("Attendance history successfully cleared!");
      setSessions([]);
    } catch (error) {
      console.error("Error clearing history:", error);
      alert("Failed to clear history. Please try again.");
    } finally {
      setIsClearing(false);
    }
  };

  if (loading) {
    return <p>Loading history...</p>;
  }

  return (
    <ProtectedRouter allowedRoles={['lecturer']}>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Attendance History</h1>
        <div className="bg-white p-4 rounded-lg shadow">
          {sessions.length === 0 ? (
            <p>No past attendance sessions found.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{session.courseName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{session.timestamp.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {session.active ? <span className="text-green-500">Active</span> : <span className="text-red-500">Ended</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/lecturer/students/${session.id}`} className="text-indigo-600 hover:text-indigo-900">View Details</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {sessions.length > 0 && (
          <button 
            onClick={clearHistory}
            disabled={isClearing}
            className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
          >
            {isClearing ? 'Clearing...' : 'Clear All History'}
          </button>
        )}
      </div>
    </ProtectedRouter>
  );
}