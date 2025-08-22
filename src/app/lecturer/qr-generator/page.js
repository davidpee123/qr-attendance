'use client';

import { useState, useEffect } from 'react';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebaseConfig';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeCanvas } from 'qrcode.react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';

export default function QrGeneratorPage() {
  const { currentUser, role, loading } = useAuth();
  const router = useRouter();
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [courseName, setCourseName] = useState('');
  const [classLocation, setClassLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [message, setMessage] = useState('');
  const [sessionActive, setSessionActive] = useState(false);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setClassLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError('');
          setMessage('Classroom location captured successfully!');
        },
        (error) => {
          setLocationError(`Error getting location: ${error.message}. Please enable location services.`);
          setMessage('');
        }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
      setMessage('');
    }
  };

  const generateQR = async () => {
    if (!courseName) {
      setMessage('Please enter a Course Name.');
      return;
    }
    if (!classLocation) {
      setMessage('Please capture the classroom location first.');
      return;
    }

    try {
      if (sessionActive) {
        setMessage('A session is already active. End the current session to start a new one.');
        return;
      }

      const uniqueSessionId = uuidv4();
      const qrCodeData = {
        sessionId: uniqueSessionId,
        courseName: courseName,
        lecturerId: currentUser.uid,
        timestamp: serverTimestamp(),
        location: classLocation,
        active: true,
      };

      await setDoc(doc(db, 'qr_sessions', uniqueSessionId), qrCodeData);

      setQrCodeValue(uniqueSessionId);
      setSessionId(uniqueSessionId);
      setSessionActive(true);
      setMessage(`QR Code generated for "${courseName}". Valid for a short time.`);
    } catch (error) {
      console.error("Error generating QR code:", error);
      setMessage(`Failed to generate QR code: ${error.message}`);
    }
  };
  
  const endSession = async () => {
    if (!sessionId) {
        setMessage('No session is currently active.');
        return;
    }
    try {
        await updateDoc(doc(db, 'qr_sessions', sessionId), { active: false });
        setSessionActive(false);
        setQrCodeValue('');
        setMessage('Session successfully ended.');
    } catch (error) {
        console.error("Error ending session:", error);
        setMessage(`Failed to end session: ${error.message}`);
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
        <p className="text-gray-500 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <ProtectedRouter allowedRoles={['lecturer']}>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-2xl">
          <h1 className="text-4xl font-extrabold text-indigo-800 mb-6 text-center">QR Code Generator</h1>
          <p className="text-gray-700 text-center mb-8">Generate an attendance QR code for your class.</p>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="courseName">
              Course Name:
            </label>
            <input
              type="text"
              id="courseName"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Computer Science 101"
              disabled={sessionActive}
            />
          </div>

          <div className="mb-6">
            <button
              onClick={getLocation}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300"
              disabled={sessionActive}
            >
              {classLocation ? 'Location Captured!' : 'Capture Classroom Location'}
            </button>
            {locationError && <p className="text-red-500 text-sm mt-2">{locationError}</p>}
            {classLocation && (
              <p className="text-green-600 text-sm mt-2">
                Location: {classLocation.latitude.toFixed(4)}, {classLocation.longitude.toFixed(4)}
              </p>
            )}
          </div>

          <button
            onClick={sessionActive ? endSession : generateQR}
            className={`w-full text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 transition duration-300 mb-6 ${
              sessionActive ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
            }`}
          >
            {sessionActive ? 'End Attendance Session' : 'Generate Attendance QR Code'}
          </button>

          {message && (
            <div className={`p-3 rounded-lg text-center mb-4 ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {message}
            </div>
          )}

          {qrCodeValue && (
            <div className="flex flex-col items-center mt-8 p-6 bg-white rounded-lg shadow-inner">
              <p className="text-lg font-semibold text-gray-800 mb-4">Scan this QR Code for Attendance:</p>
              <QRCodeCanvas value={qrCodeValue} size={256} level="H" includeMargin={true} />
              <p className="text-sm text-gray-500 mt-4">This code is time and location sensitive.</p>
              <p className="text-sm text-gray-500">Session ID: {sessionId}</p>
            </div>
          )}

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