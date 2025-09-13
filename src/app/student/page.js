'use client';
import { useState, useEffect, useRef } from 'react';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, addDoc, collection, serverTimestamp, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/firebaseConfig';
import { QrCode, FileText } from 'lucide-react';
import { initializeFaceApi, getFaceApi } from '@/services/FaceApiService';

export default function StudentDashboard() {
  const { currentUser, role, loading } = useAuth();
  const router = useRouter();
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [attendedSessions, setAttendedSessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState(null);
  const [isFaceAuthenticated, setIsFaceAuthenticated] = useState(false);
  const [hasReferencePhoto, setHasReferencePhoto] = useState(false);
  const videoRef = useRef(null);

  const [isFaceApiReady, setIsFaceApiReady] = useState(false);

  // Use a single useEffect for all data fetching and initialization
  useEffect(() => {
    const initAndFetch = async () => {
      setMessage("Initializing...");

      // Step 1: Initialize Face-API
      try {
        const initialized = await initializeFaceApi();
        setIsFaceApiReady(initialized);
        if (initialized) {
          setMessage("System is ready. Fetching user data...");
        } else {
          setMessage("Initialization failed. Please refresh the page.");
          return;
        }
      } catch (err) {
        setMessage("Initialization failed. Please refresh the page.");
        return;
      }

      // Step 2: Fetch User Data
      if (!currentUser || loading) {
        return;
      }
      
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists() && !userDoc.data().photoURL) {
        router.push('/student/register-photo');
        return;
      }
      setHasReferencePhoto(true);

      // Step 3: Set up real-time attendance listener
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
          setMessage("Dashboard ready.");
        }
      });
      return () => unsubscribe();
    };

    if (currentUser && !loading) {
      initAndFetch();
    }
  }, [currentUser, loading, router]);


  const startFaceAuthentication = async () => {
    if (!isFaceApiReady || !hasReferencePhoto) {
      setMessage("System is not ready yet. Please wait.");
      return;
    }

    setMessage("Please look at the front camera for verification...");
    let stream;
    try {
      const faceapi = getFaceApi();
      if (!faceapi) {
        throw new Error("Face-API is not initialized.");
      }

      stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" } 
      });
      videoRef.current.srcObject = stream;

      const referenceDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const referencePhotoUrl = referenceDoc.data().photoURL;

      if (!referencePhotoUrl) {
        setMessage("No reference photo found. Please upload one first.");
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = referencePhotoUrl;
      await new Promise(resolve => img.onload = resolve);

      const referenceDescriptors = await faceapi.detectSingleFace(img)
                                                 .withFaceLandmarks()
                                                 .withFaceDescriptor();

      if (!referenceDescriptors) {
        setMessage("Could not detect face in your reference photo. Please upload a new one.");
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      const interval = setInterval(async () => {
        const video = videoRef.current;
        if (!video || video.paused || video.ended) return;

        const detections = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
        
        if (detections) {
          const faceMatcher = new faceapi.FaceMatcher(referenceDescriptors, 0.6);
          const bestMatch = faceMatcher.findBestMatch(detections.descriptor);

          if (bestMatch.distance < 0.6) {
            clearInterval(interval);
            stream.getTracks().forEach(track => track.stop());
            setMessage("Authentication successful! You can now scan the QR code.");
            setIsFaceAuthenticated(true);
          } else {
            setMessage("Authentication failed. Face does not match. Please try again.");
          }
        }
      }, 500);

    } catch (err) {
      console.error("Error during face authentication:", err);
      setMessage("An error occurred during facial authentication. Please try again.");
      if (stream) stream.getTracks().forEach(track => track.stop());
    }
  };

  const startQrScanner = () => {
    setMessage("Starting QR scanner...");
    setIsScanning(true);
    const html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        formats: [Html5QrcodeSupportedFormats.QR_CODE],
        videoConstraints: { facingMode: "environment" }
      },
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
  };

  const handleAttendance = async (qrCodeToken) => {
    try {
      const q = query(collection(db, 'qr_sessions'), where('active', '==', true), where('sessionId', '==', qrCodeToken));
      const sessionSnapshot = await getDocs(q);

      if (sessionSnapshot.empty) {
        setMessage("Invalid QR code or session has expired.");
        return;
      }

      const sessionDoc = sessionSnapshot.docs[0];
      const sessionData = sessionDoc.data();
      const lecturerId = sessionData.lecturerId;
      const courseName = sessionData.courseName;

      const existingAttendanceQuery = query(
        collection(db, 'attendance'),
        where('studentUid', '==', currentUser.uid),
        where('sessionId', '==', qrCodeToken)
      );
      const existingAttendanceSnapshot = await getDocs(existingAttendanceQuery);

      if (!existingAttendanceSnapshot.empty) {
        setMessage("You have already marked attendance for this session.");
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();

      await addDoc(collection(db, 'attendance'), {
        studentUid: currentUser.uid,
        studentName: userData.displayName || userData.email.split('@')[0],
        studentMatricNo: userData.matricNo || 'N/A',
        studentEmail: userData.email,
        lecturerId: lecturerId,
        courseName: courseName,
        sessionId: qrCodeToken,
        timestamp: serverTimestamp(),
      });
      setMessage("Attendance marked successfully!");

    } catch (error) {
      console.error("Error marking attendance:", error);
      setMessage("Failed to mark attendance.");
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
    if (!hasReferencePhoto) {
      setMessage("Please upload your reference photo first.");
      return;
    }
    setIsFaceAuthenticated(false);
    setIsScanning(false);
    setMessage('');
  };

  const handleHistoryClick = () => {
    router.push('/student/history');
  };

  if (loading || !isFaceApiReady) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-500 text-lg">{message || 'Loading Student Dashboard...'}</p>
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
              className="bg-white p-6 rounded-2xl shadow-md flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition"
              onClick={handleHistoryClick}
            >
              <FileText className="h-10 w-10 text-indigo-600 mb-2" />
              <p className="font-semibold text-gray-700">History</p>
            </div>
          </div>
          
          {hasReferencePhoto && !isFaceAuthenticated && !isScanning && (
            <div className="bg-white p-6 rounded-2xl shadow-md flex flex-col items-center">
              <h2 className="text-xl font-semibold mb-4">Face Authentication</h2>
              <p className="text-gray-600 mb-4">
                We need to verify your authentication to scan the attendance.
              </p>
              <button
                onClick={startFaceAuthentication}
                className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
                disabled={!isFaceApiReady}
              >
                {isFaceApiReady ? 'Verify' : 'Initializing...'}
              </button>
              <video ref={videoRef} autoPlay muted playsInline className="w-full max-w-xs rounded-lg mt-4"></video>
            </div>
          )}

          {isFaceAuthenticated && isScanning && (
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