'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera } from 'lucide-react';
import { db } from '@/lib/firebase/firebaseConfig';
import ProtectedRouter from '@/components/ProtectedRouter';

export default function RegisterPhoto() {
  const { currentUser, role, loading } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      setMessage('No file selected.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setMessage('Invalid file format. Please upload an image.');
      return;
    }

    setIsUploadingPhoto(true);
    setMessage('Uploading photo...');

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `user_photos/${currentUser.uid}`);
      
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'users', currentUser.uid), { photoURL });

      setMessage('Photo uploaded successfully! Redirecting to dashboard...');
      setTimeout(() => {
        router.push('/student');
      }, 2000);

    } catch (error) {
      console.error("Error uploading photo:", error);
      setMessage('Failed to upload photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
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
    <ProtectedRouter allowedRoles={['student']}>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-md space-y-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800">Register Your Face</h1>
          <p className="text-gray-600">
            Please upload a clear, front-facing photo of your face. This will be used for facial authentication during attendance.
          </p>
          <div className="flex flex-col items-center">
            <label className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition cursor-pointer text-center">
              <Camera className="inline-block mr-2" />
              {isUploadingPhoto ? 'Uploading...' : 'Choose Photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={isUploadingPhoto}
                className="hidden"
              />
            </label>
            {message && (
              <div className={`mt-4 p-3 rounded-lg w-full ${message.includes('Error') || message.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRouter>
  );
}