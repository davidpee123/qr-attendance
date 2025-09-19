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
} from 'firebase/firestore';
import { QrCode, FileText, Timer } from 'lucide-react';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export default function LecturerDashboard() {
  const { currentUser, role, loading } = useAuth();
  const router = useRouter();

  // States
  const [qrCodeData, setQrCodeData] = useState(null);
  const [qrMessage, setQrMessage] = useState('');
  const [courseName, setCourseName] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [error, setError] = useState(null);
  const [qrTimer, setQrTimer] = useState(0);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [generatedQrId, setGeneratedQrId] = useState(null);

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

  // QR auto-refresh timer
  useEffect(() => {
    if (!qrCodeData) return;

    setQrTimer(30);

    const timerId = setInterval(() => {
      setQrTimer((prev) => {
        if (prev <= 1) {
          handleGenerateQrCode();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [qrCodeData]);

  const generateAndSaveQr = async () => {
    setIsGeneratingQr(true);
    setQrMessage('');
    if (!courseName) {
      setQrMessage('Please enter a course name.');
      setIsGeneratingQr(false);
      return;
    }
    if (!currentUser) {
      setQrMessage('You must be logged in to generate a QR code.');
      setIsGeneratingQr(false);
      return;
    }

    // UPDATED LOGIC FOR GRACE PERIOD
    if (generatedQrId) {
      try {
        const oldSessionRef = doc(db, 'qr_sessions', generatedQrId);
        // Set a deactivation timestamp instead of active: false
        await updateDoc(oldSessionRef, { deactivatedAt: serverTimestamp(), active: false });
      } catch (error) {
        console.error('Error invalidating old QR session:', error);
      }
    }

    const sessionId = uuidv4();
    setQrMessage('Generating new QR code...');

    try {
      const qrText = JSON.stringify({
        sessionId,
        courseName,
        lecturerId: currentUser.uid,
      });

      const qrDataUrl = await QRCode.toDataURL(qrText, {
        width: 256,
        errorCorrectionLevel: 'H',
      });

      await setDoc(doc(db, 'qr_sessions', sessionId), {
        sessionId,
        courseName,
        lecturerId: currentUser.uid,
        timestamp: serverTimestamp(),
        active: true, // New sessions are always active
      });

      setQrCodeData(qrDataUrl);
      setGeneratedQrId(sessionId);
      setQrMessage('QR code generated successfully!');
    } catch (error) {
      console.error('Error generating QR code:', error);
      setQrMessage('Failed to generate QR code.');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const handleGenerateQrCode = () => {
    if (!isGeneratingQr) {
      generateAndSaveQr();
    }
  };

  const handleStopQrCode = async () => {
    setQrCodeData(null);
    setQrMessage('QR code generation stopped.');
    setQrTimer(0);
    if (generatedQrId) {
      try {
        const sessionRef = doc(db, 'qr_sessions', generatedQrId);
        // Deactivate the session
        await updateDoc(sessionRef, { active: false, deactivatedAt: serverTimestamp() });
        console.log('QR session successfully deactivated.');
        setGeneratedQrId(null);
      } catch (error) {
        console.error('Error deactivating QR session:', error);
      }
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

  if (loading || loadingAttendance) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-500 text-lg">Loading Lecturer Dashboard...</p>
      </div>
    );
  }

  return (
    <ProtectedRouter allowedRoles={['lecturer']}>
      <div className="min-h-screen bg-grey-100 p-6 flex flex-col items-center mt-4">
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
              onClick={handleGenerateQrCode}
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
                onClick={handleGenerateQrCode}
                disabled={isGeneratingQr || !courseName}
                className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isGeneratingQr ? 'Generating...' : 'Generate QR'}
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

            {qrCodeData && (
              <div className="mt-6 flex flex-col items-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Scan for {courseName}
                </h3>
                <img
                  src={qrCodeData}
                  alt="QR Code"
                  className="w-64 h-64 border-2 border-gray-300 rounded-lg shadow-md"
                />
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                  <Timer className="h-4 w-4" />
                  <span>New code in: {qrTimer}s</span>
                </div>
                <button
                  onClick={handleStopQrCode}
                  className="mt-4 px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 transition duration-300"
                >
                  Stop QR
                </button>
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