// src/app/student/page.js

"use client";

import { useState, useEffect, useRef } from "react";
import ProtectedRouter from "@/components/ProtectedRouter";
import { useAuth } from "@/context/AuthContext";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import {
  Html5QrcodeScanner,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import { QrCode, FileText } from "lucide-react";

// ✅ Face API imports
import { initializeFaceApi, getFaceApi } from "@/services/FaceApiService";

export default function StudentDashboard() {
  const { currentUser, role, loading } = useAuth();
  const router = useRouter();
  const [scanResult, setScanResult] = useState(null);
  const [message, setMessage] = useState("");
  const [attendedSessions, setAttendedSessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState(null);
  const [isFaceAuthenticated, setIsFaceAuthenticated] = useState(false);
  const [hasReferencePhoto, setHasReferencePhoto] = useState(false);
  const videoRef = useRef(null);
  const [isFaceApiReady, setIsFaceApiReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const [livenessChallenge, setLivenessChallenge] = useState(null);
  const [isChallengeComplete, setIsChallengeComplete] = useState(false);

  // ✅ Cloudinary states
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");

  const qrScannerRef = useRef(null);

  useEffect(() => {
    const initAndFetch = async () => {
      setMessage("Initializing...");

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
        console.error("Error initializing FaceAPI:", err);
        setMessage("Initialization failed. Please refresh the page.");
        return;
      }

      if (!currentUser || loading) return;

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        if (!userDoc.data().photoURL) {
          setHasReferencePhoto(false);
        } else {
          setHasReferencePhoto(true);
          setPhotoUrl(userDoc.data().photoURL);
        }
      }

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
          setMessage("Dashboard ready.");
        }
      });
      return () => unsubscribe();
    };

    if (currentUser && !loading) {
      initAndFetch();
    }
  }, [currentUser, loading, router]);

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

  const handleScanClick = () => {
    if (!hasReferencePhoto) {
      setMessage("Please upload your reference photo first.");
      return;
    }
    setIsFaceAuthenticated(false);
    setMessage("");
  };

  const handleHistoryClick = () => {
    router.push("/student/history");
  };

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
            <div>
              <h1 className="text-2xl font-bold">
                Welcome{" "}
                {currentUser?.displayName ||
                  currentUser?.email?.split("@")[0]}{" "}
                👋
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md"
              >
                Log Out
              </button>
              <div className="h-12 w-12 rounded-full bg-purple-300 flex items-center justify-center text-lg font-bold">
                {currentUser?.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          {/* ✅ Upload Profile Photo Section */}
          {!hasReferencePhoto && (
            <div className="bg-white p-6 rounded-2xl shadow-md flex flex-col items-center">
              <h2 className="text-xl font-semibold mb-4">Upload Profile Photo</h2>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploading}
                className="mb-4"
              />
              {uploading ? (
                <p className="text-gray-600">Uploading...</p>
              ) : (
                <p className="text-gray-500">Select a clear face photo.</p>
              )}
            </div>
          )}

          {/* QR & History Buttons */}
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

          {message && (
            <div
              className={`p-3 rounded-lg text-center mt-6 ${
                message.includes("Error") ||
                message.includes("Failed") ||
                message.includes("does not match")
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </ProtectedRouter>
  );
}
