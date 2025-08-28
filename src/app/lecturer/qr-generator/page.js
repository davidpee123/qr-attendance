'use client';
import { useState, useEffect } from 'react';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/firebaseConfig';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebaseConfig';
import Link from 'next/link';

export default function QrGenerator() {
  const { currentUser, role, loading } = useAuth();
  const router = useRouter();
  const [courseName, setCourseName] = useState('');
  const [generatedQr, setGeneratedQr] = useState(null);
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  const generateAndSaveQr = async () => {
    if (!courseName) {
      setMessage('Please enter a course name.');
      return;
    }
    if (!currentUser) {
      setMessage('You must be logged in to generate a QR code.');
      return;
    }

    // Invalidate the previous QR code session if it exists
    if (generatedQr) {
      try {
        const oldSessionRef = doc(db, 'qr_sessions', generatedQr);
        await updateDoc(oldSessionRef, { active: false });
      } catch (error) {
        console.error("Error invalidating old QR session:", error);
      }
    }

    const sessionId = uuidv4();
    setMessage('Generating new QR code...');

    try {
      await setDoc(doc(db, 'qr_sessions', sessionId), {
        sessionId,
        courseName,
        lecturerId: currentUser.uid,
        timestamp: serverTimestamp(),
        active: true,
      });

      setGeneratedQr(sessionId);
      setMessage('QR code generated successfully!');
      setTimeLeft(60);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setMessage('Failed to generate QR code.');
    }
  };

  useEffect(() => {
    let intervalId;
    let timerId;

    if (generating) {
      generateAndSaveQr(); // Generate the first QR code immediately

      intervalId = setInterval(() => {
        generateAndSaveQr();
      }, 60000); // Regenerate every 60 seconds

      timerId = setInterval(() => {
        setTimeLeft(prevTime => (prevTime > 0 ? prevTime - 1 : 0));
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
      setGenerating(false);
      setMessage('QR code generation stopped.');
    } else {
      setGenerating(true);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-500 text-lg">Loading QR Generator...</p>
      </div>
    );
  }

  return (
    <ProtectedRouter allowedRoles={['lecturer']}>
      <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-indigo-800 mb-6 text-center">
            QR Code Generator
          </h1>

          <form onSubmit={handleGenerateClick} className="space-y-6">
            <div>
              <label htmlFor="courseName" className="block text-sm font-medium text-gray-700">
                Course Name
              </label>
              <input
                id="courseName"
                name="courseName"
                type="text"
                required
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              className={`w-full text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300 ${
                generating ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
              disabled={!courseName}
            >
              {generating ? 'Stop Generation' : 'Generate QR Code'}
            </button>
          </form>

          {message && (
            <div
              className={`mt-6 p-3 rounded-lg text-center text-sm font-medium ${
                message.includes('success')
                  ? 'bg-green-100 text-green-700'
                  : message.includes('Generating')
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {message}
            </div>
          )}

          {generatedQr && (
            <div className="mt-8 flex flex-col items-center">
              <p className="text-gray-600 mb-4">Scan this QR code to mark attendance:</p>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
                <QRCodeSVG value={generatedQr} size={220} />
              </div>
              <p className="mt-4 text-center text-red-500 font-bold">New code in {timeLeft} seconds</p>
            </div>
          )}

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/lecturer"
              className="w-full sm:w-auto text-center bg-gray-500 hover:bg-gray-600 text-white font-bold 
                          py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition duration-300"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold 
                          py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-300"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </ProtectedRouter>
  );
}