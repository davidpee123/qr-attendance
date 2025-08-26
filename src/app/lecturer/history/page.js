'use client';

import { useState, useEffect } from 'react';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot, writeBatch, doc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebaseConfig';
import Link from 'next/link';
import { Clock, BookOpen, Trash2 } from "lucide-react"; // Icons

export default function HistoryPage() {
  const { currentUser, loading } = useAuth();
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
    if (!confirmation) return;

    setIsClearing(true);
    const batch = writeBatch(db);

    try {
      const attendanceQuery = query(
        collection(db, 'attendance_records'),
        where('lecturerId', '==', currentUser.uid)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      attendanceSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

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
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-indigo-50 to-indigo-100">
        <p className="text-indigo-600 text-lg font-semibold animate-pulse">Loading history...</p>
      </div>
    );
  }

  return (
    <ProtectedRouter allowedRoles={['lecturer']}>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100 py-10 px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl w-full max-w-5xl border border-gray-200">
          <h1 className="text-4xl font-extrabold text-indigo-800 mb-6 text-center flex items-center justify-center gap-2">
            <BookOpen size={30} /> Attendance History
          </h1>

          {sessions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">📭 No past attendance sessions found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200">
              <table className="min-w-full bg-white rounded-xl overflow-hidden">
                <thead className="bg-indigo-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-indigo-800">Course Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-indigo-800">Date & Time</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-indigo-800">Status</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session, index) => (
                    <tr
                      key={session.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50 hover:bg-indigo-50 transition"}
                    >
                      <td className="px-6 py-4 text-sm text-gray-700">{session.courseName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 flex items-center gap-2">
                        <Clock size={16} className="text-gray-400" />
                        {session.timestamp.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {session.active ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            Ended
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <Link
                          href={`/lecturer/students/${session.id}`}
                          className="text-indigo-600 hover:text-indigo-900 font-semibold transition"
                        >
                          View Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sessions.length > 0 && (
            <button
              onClick={clearHistory}
              disabled={isClearing}
              className="mt-8 flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-300 shadow-sm"
            >
              <Trash2 size={18} />
              {isClearing ? 'Clearing...' : 'Clear All History'}
            </button>
          )}
        </div>
      </div>
    </ProtectedRouter>
  );
}
