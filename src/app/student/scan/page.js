'use client';
import { useState, useEffect } from 'react';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getDistance } from 'geolib';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/firebaseConfig';
import { markAttendance } from '@/lib/firebase/attendance'; // Import the markAttendance function

export default function StudentDashboard() {
  const { currentUser, role, loading } = useAuth();
  const router = useRouter();
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [studentLocation, setStudentLocation] = useState(null);
  const [locationError, setLocationError] = useState('');

  // Effect to handle QR code scanner initialization and cleanup
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

      const onScanError = (errorMessage) => {
        // You can leave this empty or add a console log for debugging
      };

      html5QrcodeScanner.render(onScanSuccess, onScanError);
    }

    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(error => {
          // console.error("Failed to clear html5QrcodeScanner", error);
        });
      }
    };
  }, [isScanning, currentUser]);

  const getStudentLocation = () => {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setStudentLocation(location);
            setLocationError('');
            resolve(location);
          },
          (error) => {
            setLocationError(`Error getting location: ${error.message}. Please enable location services and try again.`);
            reject(error);
          }
        );
      } else {
        setLocationError('Geolocation is not supported by this browser.');
        reject(new Error('Geolocation not supported'));
      }
    });
  };

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
    let currentStudentLocation;
    try {
      currentStudentLocation = await getStudentLocation();
      if (!currentStudentLocation) {
        throw new Error('Could not get your location.');
      }
    } catch (err) {
      setMessage(`Location error: ${err.message}. Cannot mark attendance.`);
      console.error(err);
      return;
    }

    try {
      const qrSessionRef = doc(db, 'qr_sessions', qrCodeToken);
      const qrSessionSnap = await getDoc(qrSessionRef);

      if (!qrSessionSnap.exists()) {
        setMessage('Invalid QR Code. Session not found.');
        return;
      }

      const sessionData = qrSessionSnap.data();

      // 1. Time-based Validation
      const qrTimestamp = sessionData.timestamp.toDate();
      const currentTime = new Date();
      const timeDifference = (currentTime.getTime() - qrTimestamp.getTime()) / 1000;
      const MAX_VALID_TIME_SECONDS = 300;

      if (timeDifference > MAX_VALID_TIME_SECONDS || timeDifference < -5) {
        setMessage('QR Code expired or invalid due to time.');
        return;
      }

      // 2. Geofencing Validation
      const classLocation = sessionData.location;
      if (!classLocation || !classLocation.latitude || !classLocation.longitude) {
        setMessage('Classroom location not available for this session.');
        return;
      }

      const distanceInMeters = getDistance(
        { latitude: currentStudentLocation.latitude, longitude: currentStudentLocation.longitude },
        { latitude: classLocation.latitude, longitude: classLocation.longitude }
      );
      const MAX_DISTANCE_METERS = 50;

      if (distanceInMeters > MAX_DISTANCE_METERS) {
        setMessage(`You are too far from the classroom (${distanceInMeters.toFixed(2)}m). Cannot mark attendance.`);
        return;
      }

      // 3. One-Time Use Validation
      if (!sessionData.active) {
        setMessage('This QR Code has already been used or deactivated.');
        return;
      }

      // Call the external function to mark attendance and handle the rest of the logic
      await markAttendance(sessionData, currentUser, currentStudentLocation, setMessage, setScanResult);

      // Deactivate the QR session immediately after successful attendance
      await updateDoc(qrSessionRef, { active: false });

    } catch (error) {
      console.error("Error during attendance process:", error);
      setMessage(`Failed to process attendance: ${error.message}`);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-500 text-lg">Loading Student Dashboard...</p>
      </div>
    );
  }

  return (
    <ProtectedRouter allowedRoles={['student']}>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <h1 className="text-4xl font-extrabold text-indigo-800 mb-6 text-center">Student Dashboard</h1>
          <p className="text-gray-700 text-center mb-8">Welcome, {currentUser?.email}!</p>

          <button
            onClick={() => {
              setIsScanning(true);
              setMessage('Please grant camera access to scan QR code.');
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-300 mb-6"
          >
            Scan QR Code for Attendance
          </button>

          {locationError && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-4">
              {locationError}
            </div>
          )}

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
          
          {scanResult && <p className="mt-4 text-center text-gray-600">Last Scanned: {scanResult}</p>}

          <button
            onClick={handleLogout}
            className="mt-8 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-300"
          >
            Log Out
          </button>
        </div>
      </div>
    </ProtectedRouter>
  );
}