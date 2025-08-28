'use client';
import { useState, useEffect } from 'react';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, onSnapshot, query, where } from 'firebase/firestore';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/firebaseConfig';
import { QrCode, FileText } from 'lucide-react';

export default function StudentDashboard() {
  const { currentUser, role, loading } = useAuth();
  const router = useRouter();
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [attendedSessions, setAttendedSessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let html5QrcodeScanner = null;
    if (isScanning) {
      html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      const onScanSuccess = async (decodedText) => {
        setIsScanning(false);
        html5QrcodeScanner.clear();
        setScanResult(decodedText);
        await handleAttendance(decodedText);
      };
      const onScanError = (errorMessage) => {};
      html5QrcodeScanner.render(onScanSuccess, onScanError);
    }
    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(error => {});
      }
    };
  }, [isScanning, currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setLoadingHistory(false);
      return;
    }
    setLoadingHistory(true);
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where("studentUid", "==", currentUser.uid)
    );
    const unsubscribe = onSnapshot(attendanceQuery, (querySnapshot) => {
      try {
        const records = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            courseName: data.courseName || 'Unknown Course',
            timestamp: data.timestamp ? data.timestamp.toDate() : null,
          };
        });
        setAttendedSessions(records.filter(r => r.timestamp !== null));
        setError(null);
      } catch (err) {
        console.error("Error fetching attendance history:", err);
        setError("Failed to load attendance history.");
      } finally {
        setLoadingHistory(false);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleAttendance = async (qrCodeToken) => {
    if (!currentUser) {
      setMessage('You must be logged in to mark attendance.');
      return;
    }
    if (!qrCodeToken) {
      setMessage('No QR code scanned.');
      return;
    }
    setMessage('Processing attendance...');
    try {
      const qrSessionRef = doc(db, 'qr_sessions', qrCodeToken);
      const qrSessionSnap = await getDoc(qrSessionRef);

      if (!qrSessionSnap.exists()) {
        setMessage('Invalid QR Code. Session not found.');
        return;
      }
      const sessionData = qrSessionSnap.data();

      const qrTimestamp = sessionData.timestamp.toDate();
      const currentTime = new Date();
      const timeDifference = (currentTime.getTime() - qrTimestamp.getTime()) / 1000;
      const MAX_VALID_TIME_SECONDS = 300;

      if (timeDifference > MAX_VALID_TIME_SECONDS || timeDifference < 0) {
        setMessage('QR Code expired or invalid due to time.');
        return;
      }

      if (!sessionData.active) {
        setMessage('This QR Code has already been used or deactivated.');
        return;
      }

      
      await addDoc(collection(db, "attendance"), {
        studentUid: currentUser.uid,
        studentName: currentUser.displayName || currentUser.email?.split('@')[0],
        courseName: sessionData.courseName,
        sessionId: qrCodeToken,
        lecturerId: sessionData.lecturerId, 
        timestamp: serverTimestamp(),
      });

      await updateDoc(qrSessionRef, { active: false });
      setMessage('✅ Attendance marked successfully!');
    } catch (error) {
      console.error("Error during attendance process:", error);
      setMessage(`❌ Failed to process attendance: ${error.message}`);
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

  const handleScanClick = () => {
    setIsScanning(true);
    setMessage('Please grant camera access to scan QR code.');
  };

  const handleHistoryClick = () => {
   
  };

  if (loading || loadingHistory) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-500 text-lg">Loading Student Dashboard...</p>
      </div>
    );
  }

  return (
    <ProtectedRouter allowedRoles={['student']}>
      <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
        <div className="w-full max-w-3xl space-y-6">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Welcome {currentUser?.displayName || currentUser?.email?.split('@')[0]} 👋
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md">
                Log Out
              </button>
              <div className="h-12 w-12 rounded-full bg-purple-300 flex items-center justify-center text-lg font-bold">
                {currentUser?.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div
              className="bg-white p-6 rounded-2xl shadow-md flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition"
              onClick={handleScanClick}
            >
              <QrCode className="h-10 w-10 text-indigo-600 mb-2" />
              <p className="font-semibold text-gray-700">Scan QR</p>
            </div>
            <div
              className="bg-white p-6 rounded-2xl shadow-md flex flex-col items-center justify-center"
            >
              <FileText className="h-10 w-10 text-indigo-600 mb-2" />
              <p className="font-semibold text-gray-700">History</p>
            </div>
          </div>
          
          {isScanning && (
            <div className="mt-6 flex flex-col items-center">
              <p className="text-gray-600 mb-4">Position your camera over the QR code:</p>
              <div id="qr-reader" style={{ width: '100%', maxWidth: '300px' }}></div>
              <button
                onClick={() => {
                  setIsScanning(false);
                  setMessage('Scan cancelled.');
                  const scanner = document.getElementById('qr-reader');
                  if (scanner) scanner.innerHTML = '';
                }}
                className="mt-4 px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition duration-300"
              >
                Stop Scan
              </button>
            </div>
          )}
          
          {message && (
            <div className={`p-3 rounded-lg text-center mt-6 ${message.includes('Error') || message.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {message}
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Attendance Records</h2>
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-4">
                {error}
              </div>
            )}
            {attendedSessions.length === 0 ? (
              <div className="flex flex-col items-center text-gray-500 py-10">
                <p>No attendance records yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendedSessions.map((session, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">{session.courseName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{session.timestamp.toLocaleString()}</td>
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