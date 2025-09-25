// src/components/FaceAuthentication.js
'use client';

import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebaseConfig';
import { useAuth } from '@/context/AuthContext';
import { initializeFaceApi, getFaceApi } from '@/services/faceApiService';

export default function FaceAuthentication({ onAuthenticated, setScanMessage, setHasReferencePhoto }) {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [isFaceApiReady, setIsFaceApiReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const [isChallengeComplete, setIsChallengeComplete] = useState(false);

  const videoRef = useRef(null);
  const intervalRef = useRef(null);

  // helpers
  const descriptorDistance = (d1, d2) => {
    if (!d1 || !d2 || d1.length !== d2.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < d1.length; i++) {
      const diff = d1[i] - d2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  };

  const pointDistance = (p1, p2) => {
    if (!p1 || !p2) return Infinity;
    // p1 and p2 may be objects {x,y} or arrays [x,y]
    const x1 = p1.x ?? p1[0];
    const y1 = p1.y ?? p1[1];
    const x2 = p2.x ?? p2[0];
    const y2 = p2.y ?? p2[1];
    return Math.hypot(x1 - x2, y1 - y2);
  };

  const stopStream = (stream) => {
    try {
      if (stream && stream.getTracks) {
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (e) {
      console.warn('Error stopping stream', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setMessage('Initializing face system...');
      // use 'tiny' for realtime webcam
      const ok = await initializeFaceApi('tiny');
      setIsFaceApiReady(ok);
      setMessage(ok ? 'Face system ready.' : 'Face initialization failed.');
    };
    init();

    return () => {
      // cleanup on unmount
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (videoStream) stopStream(videoStream);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (videoRef.current && videoStream) {
      try {
        videoRef.current.srcObject = videoStream;
        videoRef.current.play().catch((e) => console.warn('video play() failed', e));
      } catch (e) {
        console.warn('set srcObject failed', e);
      }
    }
  }, [videoStream]);

  const startFaceAuthentication = async () => {
    if (!isFaceApiReady || isAuthenticating) {
      setMessage('System not ready or already authenticating.');
      return;
    }
    setIsAuthenticating(true);
    setMessage('Preparing camera...');

    let stream = null;
    try {
      const faceapi = getFaceApi();
      if (!faceapi) throw new Error('face-api not available');

      // get camera
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setVideoStream(stream);

      // fetch user reference photo
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists() || !userDoc.data()?.photoURL) {
        setHasReferencePhoto(false);
        setMessage('No reference photo found. Upload one first.');
        setIsAuthenticating(false);
        stopStream(stream);
        setVideoStream(null);
        return;
      }
      setHasReferencePhoto(true);
      const referencePhotoUrl = userDoc.data().photoURL;

      // load reference image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = referencePhotoUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = (e) => reject(new Error('Failed to load reference image: ' + e));
      });

      // detect on reference image (tiny detector)
      const referenceDetections = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!referenceDetections) {
        setMessage('Could not detect face in reference photo. Upload clearer photo.');
        setIsAuthenticating(false);
        stopStream(stream);
        setVideoStream(null);
        return;
      }

      const referenceDescriptor = referenceDetections.descriptor;
      // build labeled descriptor for FaceMatcher
      const labeled = [new faceapi.LabeledFaceDescriptors(currentUser.uid, [referenceDescriptor])];
      const faceMatcher = new faceapi.FaceMatcher(labeled, 0.6);

      // Liveness: blink detection baseline
      let initialEyeDistance = 0;
      let attempts = 0;
      const MAX_ATTEMPTS = 60; // 60 * 500ms = 30s

      setMessage('Please face the camera. Blink when prompted.');

      intervalRef.current = setInterval(async () => {
        try {
          attempts++;
          if (attempts > MAX_ATTEMPTS) {
            clearInterval(intervalRef.current);
            setMessage('Liveness check timed out. Try again.');
            setIsAuthenticating(false);
            stopStream(stream);
            setVideoStream(null);
            return;
          }

          const video = videoRef.current;
          if (!video || video.readyState < 2) {
            return;
          }

          const detections = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (!detections) {
            setMessage('No face detected. Please face the camera.');
            return;
          }

          // match descriptors
          const best = faceMatcher.findBestMatch(detections.descriptor);
          console.log('FaceAuthentication: match', best.toString());
          if (best.distance > 0.6) {
            clearInterval(intervalRef.current);
            setMessage('Face does not match reference. Authentication failed.');
            setIsAuthenticating(false);
            stopStream(stream);
            setVideoStream(null);
            return;
          }

          // blink detection (simple vertical eye distance)
          const leftEye = detections.landmarks.getLeftEye();
          const rightEye = detections.landmarks.getRightEye();

          const leftEyeDist = pointDistance(leftEye[1], leftEye[4]);
          const rightEyeDist = pointDistance(rightEye[1], rightEye[4]);
          const eyeDist = (leftEyeDist + rightEyeDist) / 2;

          if (initialEyeDistance === 0) {
            initialEyeDistance = eyeDist;
            setMessage('Please blink your eyes to verify liveness.');
            // continue; wait for next frame to measure blink
          } else {
            // when eyes close, vertical distance will drop significantly
            if (eyeDist < initialEyeDistance * 0.5) {
              // blink detected
              console.log('Blink detected');
              clearInterval(intervalRef.current);
              setIsChallengeComplete(true);
              setMessage('Liveness check passed. Authentication successful.');

              // finalize
              setIsAuthenticating(false);
              stopStream(stream);
              setVideoStream(null);
              onAuthenticated(true);
              if (setScanMessage) setScanMessage('Authentication successful! You can now scan the QR code.');
              return;
            }
          }

        } catch (err) {
          console.error('Error during liveness check:', err);
          clearInterval(intervalRef.current);
          setMessage('Error during authentication. Try again.');
          setIsAuthenticating(false);
          stopStream(stream);
          setVideoStream(null);
        }
      }, 500);

    } catch (err) {
      console.error('startFaceAuthentication error', err);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (stream) stopStream(stream);
      setVideoStream(null);
      setIsAuthenticating(false);
      setMessage('An error occurred while authenticating. Check console for details.');
    }
  };
  return (
    <div className="bg-white p-6 rounded-2xl shadow-md flex flex-col items-center">
      <h2 className="text-xl font-semibold mb-4">Face Authentication</h2>
      <p className="text-gray-600 mb-4">
        We need to verify your authentication to scan the attendance.
      </p>

      <button
        onClick={startFaceAuthentication}
        className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
        disabled={!isFaceApiReady || isAuthenticating}
      >
        {isAuthenticating ? "Verifying..." : isFaceApiReady ? "Verify" : "Initializing..."}
      </button>

      {/* Camera preview with circle style */}
      <div
        className={`
        mt-6 w-48 h-48 rounded-full overflow-hidden border-4 
        flex items-center justify-center 
        ${message.includes("successful") ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.7)]" : ""}
        ${message.includes("failed") ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.7)]" : ""}
        ${message.includes("No face") || message.includes("not ready") ? "border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.7)]" : ""}
      `}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </div>

      {/* Feedback message */}
      {message && (
        <div
          className={`
          p-3 rounded-lg text-center mt-4 w-full 
          ${message.includes("failed") || message.includes("not")
              ? "bg-red-100 text-red-700"
              : message.includes("successful")
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }
        `}
        >
          {message}
        </div>
      )}
    </div>
  );;

};