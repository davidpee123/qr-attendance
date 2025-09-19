'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/firebaseConfig';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { QrCode, FileText, Timer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';

export default function LecturerDashboard() {
  const { currentUser, role, loading } = useAuth();
  const router = useRouter();

  // States
  const [courseName, setCourseName] = useState('');
  const [generatedQr, setGeneratedQr] = useState(null);
  const [qrMessage, setQrMessage] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [error, setError] = useState(null);
  const [qrTimer, setQrTimer] = useState(0);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Fetch attendance records
  useEffect(() => {
    if (!currentUser) {
      setLoadingAttendance(false);
      return;
    }

    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('lecturerId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(attendanceQuery, async (querySnapshot) => {
      try {
        const records = querySnapshot.docs.map((doc) => doc.data());
        const uniqueStudentUids = [
          ...new Set(records.map((rec) => rec.studentUid)),
        ];
        const studentDetailsMap = {};

        for (const uid of uniqueStudentUids) {
          const userDocRef = doc(db, 'users', uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            studentDetailsMap[uid] = userDocSnap.data();
          }
        }

        const combinedData = records.map((record) => {
          const student = studentDetailsMap[record.studentUid] || {};
          return {
            ...record,
            studentEmail: student.email || 'N/A',
            studentMatricNo: student.matricNo || 'N/A',
          };
        });

        setAttendanceRecords(combinedData);
        setError(null);
      } catch (err) {
        console.error('Error fetching attendance records:', err);
        setError('Failed to load attendance records.');
      } finally {
        setLoadingAttendance(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // The simplified QR generation logic from your working QrGenerator.js
  const generateAndSaveQr = async () => {
    setQrTimer(30);

    if (!courseName) {
      setQrMessage('Please enter a course name.');
      return;
    }
    if (!currentUser) {
      setQrMessage('You must be logged in to generate a QR code.');
      return;
    }

    if (generatedQr) {
      try {
        const oldSessionRef = doc(db, 'qr_sessions', generatedQr);
        await updateDoc(oldSessionRef, { active: false, deactivatedAt: serverTimestamp() });
      } catch (error) {
        console.error("Error invalidating old QR session:", error);
      }
    }

    const sessionId = uuidv4();
    setQrMessage('Generating new QR code...');

    try {
      await setDoc(doc(db, 'qr_sessions', sessionId), {
        sessionId,
        courseName,
        lecturerId: currentUser.uid,
        timestamp: serverTimestamp(),
        active: true,
      });

      setGeneratedQr(sessionId);
      setQrMessage('QR code generated successfully!');
    } catch (error) {
      console.error('Error generating QR code:', error);
      setQrMessage('Failed to generate QR code.');
    }
  };

  useEffect(() => {
    let intervalId;
    let timerId;

    if (generating) {
      generateAndSaveQr();

      intervalId = setInterval(() => {
        generateAndSaveQr();
      }, 30000);

      timerId = setInterval(() => {
        setQrTimer(prevTime => (prevTime > 0 ? prevTime - 1 : 0));
      }, 1000);
    } else {
      clearInterval(intervalId);
      clearInterval(timerId);
    }

    return () => {
      clearInterval(intervalId);
      clearInterval(timerId);
    };
  }, [generating, courseName, currentUser]);

  const handleGenerateClick = (e) => {
    e.preventDefault();
    if (generating) {
      handleStopQrCode(); // Call stop function
    } else {
      setGenerating(true);
    }
  };

  const handleStopQrCode = async () => {
    if (generatedQr) {
      try {
        const sessionRef = doc(db, 'qr_sessions', generatedQr);
        await updateDoc(sessionRef, { active: false, deactivatedAt: serverTimestamp() });
        console.log('QR session successfully deactivated.');
        setGeneratedQr(null);
        setGenerating(false);
        setQrTimer(0);
        setQrMessage('QR code generation stopped.');
      } catch (error) {
        console.error('Error deactivating QR session:', error);
        setQrMessage('Failed to stop QR code generation.');
      }
    }
  };

  const handleClearAttendance = async () => {
    const confirmClear = window.confirm("Are you sure you want to clear all attendance records? This action cannot be undone.");
    if (!confirmClear) {
        return;
    }

    try {
        setLoadingAttendance(true);
        setError(null);

        const attendanceQuery = query(
            collection(db, 'attendance'),
            where('lecturerId', '==', currentUser.uid)
        );
        const querySnapshot = await getDocs(attendanceQuery);

        if (querySnapshot.empty) {
            setQrMessage('No attendance records to clear.');
            setLoadingAttendance(false);
            return;
        }

        const batch = writeBatch(db);
        querySnapshot.docs.forEach((d) => {
            batch.delete(d.ref);
        });

        await batch.commit();
        setAttendanceRecords([]);
        setQrMessage('All attendance records have been cleared successfully!');
    } catch (err) {
        console.error('Error clearing attendance records:', err);
        setError('Failed to clear attendance records.');
    } finally {
        setLoadingAttendance(false);
    }
};

  const handleLogout = async () => {
    try {
      if (generatedQr) {
        const sessionRef = doc(db, 'qr_sessions', generatedQr);
        await updateDoc(sessionRef, { active: false, deactivatedAt: serverTimestamp() });
      }
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
      <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center pt-12">
        <div className="w-full max-w-5xl space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Welcome Prof {currentUser?.displayName || currentUser?.email?.split('@')[0]} 👋
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md"
              >
                Log Out
              </button>
              <div className="h-12 w-12 rounded-full bg-purple-300 flex items-center justify-center text-lg font-bold">
                {currentUser?.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className="bg-white p-6 rounded-2xl shadow-md flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition"
              onClick={handleGenerateClick}
            >
              <QrCode className="h-10 w-10 text-indigo-600 mb-2" />
              <p className="font-semibold text-gray-700">Create QR Session</p>
            </div>
            <div
              className="bg-white p-6 rounded-2xl shadow-md flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition"
              onClick={() => setShowHistory(!showHistory)}
            >
              <FileText className="h-10 w-10 text-indigo-600 mb-2" />
              <p className="font-semibold text-gray-700">View History</p>
            </div>
          </div>

          {/* QR Section */}
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Create New QR Session</h2>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <input
                type="text"
                placeholder="Enter course name (e.g., CSD328)"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleGenerateClick}
                className={`w-full sm:w-auto px-6 py-2 rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed ${
                  generating ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
                disabled={!courseName}
              >
                {generating ? 'Stop Generation' : 'Generate QR'}
              </button>
            </div>

            {qrMessage && (
              <div
                className={`mt-4 p-3 rounded-lg text-center ${
                  qrMessage.includes('Error') || qrMessage.includes('Failed')
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {qrMessage}
              </div>
            )}

            {generatedQr && (
              <div className="mt-6 flex flex-col items-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Scan for {courseName}
                </h3>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
                  <QRCodeSVG value={generatedQr} size={220} />
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                  <Timer className="h-4 w-4" />
                  <span>New code in: {qrTimer}s</span>
                </div>
              </div>
            )}
          </div>

          {/* Attendance History */}
          <div
            className={`transition-all duration-500 ease-in-out transform ${
              showHistory
                ? 'max-h-[1000px] opacity-100 translate-y-0 mt-6'
                : 'max-h-0 opacity-0 -translate-y-4'
            } overflow-hidden`}
          >
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Class Attendance Records
              </h2>

              {/* New Clear Button */}
              {attendanceRecords.length > 0 && (
                <div className="flex justify-end mb-4">
                    <button
                        onClick={handleClearAttendance}
                        className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition"
                    >
                        Clear All Records
                    </button>
                </div>
              )}

              {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-4">
                  {error}
                </div>
              )}

              {attendanceRecords.length === 0 ? (
                <div className="flex flex-col items-center text-gray-500 py-10">
                  <p>No attendance records yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Matric No.
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Course
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Marked On
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Session ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceRecords.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">{record.studentName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{record.studentMatricNo}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{record.studentEmail}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{record.courseName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {record.timestamp?.toDate().toLocaleString() || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap break-all text-xs">
                            {record.sessionId}
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
      </div>
    </ProtectedRouter>
  );
}