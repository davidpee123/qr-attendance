'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/firebaseConfig';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot, getDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { QrCode, FileText } from 'lucide-react';
import QRCode from 'qrcode';

export default function LecturerDashboard() {
  const { currentUser, role, loading } = useAuth();
  const router = useRouter();
  const [qrCodeData, setQrCodeData] = useState(null);
  const [qrMessage, setQrMessage] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

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
        const records = querySnapshot.docs.map(doc => doc.data());

        const uniqueStudentUids = [...new Set(records.map(rec => rec.studentUid))];
        const studentDetailsMap = {};

        for (const uid of uniqueStudentUids) {
          const userDocRef = doc(db, 'users', uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            studentDetailsMap[uid] = userDocSnap.data();
          }
        }

        const combinedData = records.map(record => {
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
        console.error("Error fetching attendance records:", err);
        setError("Failed to load attendance records.");
      } finally {
        setLoadingAttendance(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const generateQRCode = async (courseName) => {
    if (!courseName) {
      setQrMessage('Please enter a course name.');
      return;
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    try {
      const sessionRef = doc(db, 'qr_sessions', sessionId);
      await setDoc(sessionRef, {
        lecturerId: currentUser.uid,
        courseName,
        timestamp: serverTimestamp(),
        active: true,
      });

      const qrCodeUrl = await QRCode.toDataURL(sessionId);
      setQrCodeData(qrCodeUrl);
      setQrMessage('QR Code generated successfully!');
    } catch (error) {
      console.error("Error generating QR code:", error);
      setQrMessage("Failed to generate QR code.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const handleCreateQrSession = () => {
    const courseName = prompt("Enter course name to create a new session:");
    if (courseName) {
      generateQRCode(courseName);
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
      <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
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

          {/* Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className="bg-white p-6 rounded-2xl shadow-md flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition"
              onClick={handleCreateQrSession}
            >
              <QrCode className="h-10 w-10 text-indigo-600 mb-2" />
              <p className="font-semibold text-gray-700">Create QR Session</p>
            </div>
            <div
              className="bg-white p-6 rounded-2xl shadow-md flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition"
              onClick={() => setShowHistory(prev => !prev)}
            >
              <FileText className="h-10 w-10 text-indigo-600 mb-2" />
              <p className="font-semibold text-gray-700">
                {showHistory ? "Hide History" : "View History"}
              </p>
            </div>
          </div>

          {/* QR Code Message */}
          {qrMessage && (
            <div
              className={`p-3 rounded-lg text-center mt-6 ${
                qrMessage.includes('Error') || qrMessage.includes('Failed')
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {qrMessage}
            </div>
          )}

          {/* QR Code */}
          {qrCodeData && (
            <div className="bg-white p-6 rounded-2xl shadow-md flex flex-col items-center">
              <h2 className="text-xl font-semibold mb-4">Scan this QR Code for Attendance</h2>
              <img src={qrCodeData} alt="QR Code" className="w-64 h-64 border-2 border-gray-300" />
            </div>
          )}

          {/* Attendance Records (toggle) */}
          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${
              showHistory ? "max-h-[1000px] opacity-100 mt-6" : "max-h-0 opacity-0"
            }`}
          >
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Class Attendance Records</h2>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matric No.</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marked On</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session ID</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceRecords.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4">{record.studentName}</td>
                          <td className="px-6 py-4">{record.studentMatricNo}</td>
                          <td className="px-6 py-4">{record.studentEmail}</td>
                          <td className="px-6 py-4">{record.courseName}</td>
                          <td className="px-6 py-4">
                            {record.timestamp?.toDate().toLocaleString() || 'N/A'}
                          </td>
                          <td className="px-6 py-4">{record.sessionId}</td>
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
