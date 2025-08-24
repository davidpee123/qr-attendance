'use client';
import { useState, useEffect } from 'react';
import ProtectedRouter from '@/components/ProtectedRouter';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
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

  // Generates a unique session ID
  const generateRandomId = () => {
    return uuidv4();
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!courseName) {
      setMessage('Please enter a course name.');
      return;
    }
    if (!currentUser) {
      setMessage('You must be logged in to generate a QR code.');
      return;
    }

    setGenerating(true);
    setMessage('Generating QR code...');
    const sessionId = generateRandomId();

    try {
      await setDoc(doc(db, 'qr_sessions', sessionId), {
        sessionId,
        courseName,
        lecturerId: currentUser.uid, // This is the crucial line for security
        timestamp: serverTimestamp(),
        active: true,
      });

      setGeneratedQr(sessionId);
      setMessage('QR code generated successfully!');
    } catch (error) {
      console.error('Error generating QR code:', error);
      setMessage('Failed to generate QR code.');
    } finally {
      setGenerating(false);
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
        <p className="text-gray-500 text-lg">Loading Lecturer Dashboard...</p>
      </div>
    );
  }

  return (
    <ProtectedRouter allowedRoles={['lecturer']}>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <h1 className="text-4xl font-extrabold text-indigo-800 mb-6 text-center">QR Code Generator</h1>

          <form onSubmit={handleGenerate} className="space-y-6">
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300"
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Generate QR Code'}
            </button>
          </form>

          {message && (
            <div className={`mt-6 p-3 rounded-lg text-center ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}

          {generatedQr && (
            <div className="mt-8 flex flex-col items-center">
              <p className="text-gray-600 mb-4">Scan this QR code to mark attendance:</p>
              <div className="p-4 bg-white border border-gray-300 rounded-lg">
                <QRCodeSVG value={generatedQr} size={256} />
              </div>
              <p className="mt-4 text-center text-sm text-gray-500 break-words max-w-full">
                Session ID: {generatedQr}
              </p>
            </div>
          )}

          <div className="mt-8 flex justify-center space-x-4">
            <Link
              href="/lecturer/dashboard"
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition duration-300"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-300"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </ProtectedRouter>
  );
}