'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { db } from '@/lib/firebase/firebaseConfig';
import ProtectedRouter from '@/components/ProtectedRouter';

export default function RegisterPhoto() {
  const { currentUser, role, loading } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const handlePhotoUpload = async (file) => {
    setIsUploadingPhoto(true);
    setMessage('Uploading photo...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'student_profiles');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      const photoURL = data.secure_url;

      if (!photoURL) {
        throw new Error('Cloudinary upload failed.');
      }

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

  const startCamera = async () => {
    setMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setMessage("Could not access camera. Please ensure permissions are granted.");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], "student_photo.jpeg", { type: "image/jpeg" });
      handlePhotoUpload(file);
    }, 'image/jpeg');

    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handlePhotoUpload(file);
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
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 relative">
        <div className="absolute inset-0 z-0">
          <div 
            className="w-full h-full bg-no-repeat bg-center opacity-10"
            style={{ 
              backgroundImage: 'url(/banner_new.png)',
              backgroundSize: '150px 150px' 
            }}
          ></div>
        </div>
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg space-y-6 text-center relative z-10">
          <h1 className="text-3xl font-bold text-gray-800">Register Your Face</h1>
          <p className="text-gray-600">
            Please upload or take a clear, front-facing photo of your face.
          </p>

          {!isCameraActive ? (
            <div className="flex flex-col gap-4">
              <label className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition cursor-pointer text-center">
                <ImageIcon className="inline-block mr-2" />
                {isUploadingPhoto ? 'Uploading...' : 'Choose from Gallery'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
              </label>
              <button
                onClick={startCamera}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                disabled={isUploadingPhoto}
              >
                <Camera className="inline-block mr-2" />
                Take Photo
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <video ref={videoRef} autoPlay playsInline className="rounded-lg w-full"></video>
              <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
              <button
                onClick={capturePhoto}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Capture
              </button>
              <button
                onClick={stopCamera}
                className="w-full px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          )}

          {message && (
            <div className={`mt-4 p-3 rounded-lg w-full ${message.includes('Error') || message.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </ProtectedRouter>
  );
}