
// src/app/student/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import ProtectedRouter from "@/components/ProtectedRouter";
import { useAuth } from "@/context/AuthContext";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  query,
  where,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import { QrCode, FileText } from "lucide-react";

// ✅ Face API
import * as faceapi from "face-api.js";

export default function StudentDashboard() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  // 🔹 State
  const [message, setMessage] = useState("");
  const [attendedSessions, setAttendedSessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState(null);

  const [isFaceAuthenticated, setIsFaceAuthenticated] = useState(false);
  const [hasReferencePhoto, setHasReferencePhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [isFaceApiReady, setIsFaceApiReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // 🔹 Camera ref
  const videoRef = useRef(null);

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setMessage("Loading Face Recognition models...");
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
        setIsFaceApiReady(true);
        setMessage("Face Recognition ready.");
      } catch (err) {
        console.error("Error loading face-api.js models:", err);
        setMessage("Failed to load Face Recognition models.");
      }
    };
    loadModels();
  }, []);

  // Load user data + attendance history
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || loading) return;

      // 🔹 User data
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        if (userDoc.data().photoURL) {
          setHasReferencePhoto(true);
          setPhotoUrl(userDoc.data().photoURL);
        }
      }

      // 🔹 Attendance records
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("studentUid", "==", currentUser.uid)
      );

      const unsubscribe = onSnapshot(attendanceQuery, (querySnapshot) => {
        try {
          const records = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              courseName: data.courseName || "Unknown Course",
              timestamp: data.timestamp ? data.timestamp.toDate() : null,
            };
          });
          setAttendedSessions(records.filter((r) => r.timestamp !== null));
          setError(null);
        } catch (err) {
          console.error("Error fetching attendance history:", err);
          setError("Failed to load attendance history.");
        } finally {
          setLoadingHistory(false);
        }
      });

      return () => unsubscribe();
    };

    fetchData();
  }, [currentUser, loading]);

  // 🔹 Cloudinary Upload Handler
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    );

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error("Cloudinary upload failed");

      setPhotoUrl(data.secure_url);

      // ✅ Save uploaded photo to Firestore user profile
      await updateDoc(doc(db, "users", currentUser.uid), {
        photoURL: data.secure_url,
      });

      setHasReferencePhoto(true);
      setMessage("Profile photo uploaded successfully.");
    } catch (error) {
      console.error("Error uploading photo:", error);
      setMessage("Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // 🔹 Face Authentication Handler
  const startFaceAuthentication = async () => {
    if (!isFaceApiReady || !photoUrl) {
      setMessage("Face Recognition system not ready.");
      return;
    }

    setIsAuthenticating(true);
    setMessage("Authenticating with FaceID...");

    try {
      // Start webcam
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;

      await new Promise((resolve) => {
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          resolve();
        };
      });

      // Detect face in live video
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) throw new Error("No face detected.");

      // Load reference photo
      const referenceImage = await faceapi.fetchImage(photoUrl);
      const referenceDetection = await faceapi
        .detectSingleFace(referenceImage, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!referenceDetection) throw new Error("Reference photo not valid.");

      // Compare descriptors
      const distance = faceapi.euclideanDistance(
        detection.descriptor,
        referenceDetection.descriptor
      );

      if (distance < 0.45) {
        setIsFaceAuthenticated(true);
        setMessage("✅ Face authentication successful! You can scan QR now.");
      } else {
        throw new Error("Face does not match reference.");
      }
    } catch (error) {
      console.error("Face authentication failed:", error);
      setIsFaceAuthenticated(false);
      setMessage("❌ Face authentication failed: " + error.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // 🔹 Attendance handler (marks attendance after QR scan + face auth)
  const markAttendance = async (courseName = "Unknown Course") => {
    try {
      await addDoc(collection(db, "attendance"), {
        studentUid: currentUser.uid,
        courseName,
        timestamp: serverTimestamp(),
      });
      setMessage("✅ Attendance marked successfully.");
    } catch (error) {
      console.error("Error marking attendance:", error);
      setMessage("❌ Failed to mark attendance.");
    }
  };

  // Navigation
  const handleHistoryClick = () => router.push("/student/history");
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  if (loading || !isFaceApiReady) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-500 text-lg">
          {message || "Loading Student Dashboard..."}
        </p>
      </div>
    );
  }

  return (
    <ProtectedRouter allowedRoles={["student"]}>
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 flex flex-col items-center">
        <div className="w-full max-w-3xl space-y-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              Welcome {currentUser?.displayName || currentUser?.email?.split("@")[0]} 👋
            </h1>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md"
            >
              Log Out
            </button>
          </div>

          {/* Upload Photo */}
          {!hasReferencePhoto && (
            <div className="bg-white p-6 rounded-2xl shadow-md text-center">
              <h2 className="text-xl font-semibold mb-4">Upload Profile Photo</h2>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} />
              {uploading && <p className="text-gray-600 mt-2">Uploading...</p>}
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4">
            <div
              onClick={startFaceAuthentication}
              className="bg-white p-6 rounded-2xl shadow-md flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition"
            >
              <QrCode className="h-10 w-10 text-indigo-600 mb-2" />
              <p className="font-semibold text-gray-700">Face Authenticate & Scan QR</p>
            </div>
            <div
              onClick={handleHistoryClick}
              className="bg-white p-6 rounded-2xl shadow-md flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition"
            >
              <FileText className="h-10 w-10 text-indigo-600 mb-2" />
              <p className="font-semibold text-gray-700">History</p>
            </div>
          </div>

          {/* Spinner during Authentication */}
          {isAuthenticating && (
            <div className="flex justify-center items-center mt-6">
              <svg
                className="animate-spin h-6 w-6 text-indigo-600 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                ></path>
              </svg>
              <span className="text-gray-700 font-medium">Authenticating…</span>
            </div>
          )}

          {/* Camera */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full max-w-xs rounded-lg mt-4"
          ></video>

          {/* Messages */}
          {message && (
            <div
              className={`p-3 rounded-lg text-center mt-6 ${
                message.includes("❌")
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {message}
            </div>
          )}

          {/* Attendance Records */}
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Your Attendance Records
            </h2>
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-4">
                {error}
              </div>
            )}
            {attendedSessions.length === 0 ? (
              <p className="text-gray-500">No attendance records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendedSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {session.courseName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {session.timestamp?.toLocaleString()}
                        </td>
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

