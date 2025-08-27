"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { auth, db } from '@/lib/firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp, getDoc, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

// Import QR scanner dynamically so it works with Next.js
const QrScanner = dynamic(() => import("@yudiel/react-qr-scanner"), { ssr: false });

export default function StudentQRScanner() {
  const { user } = useAuth(); // Current logged-in student
  const [scanned, setScanned] = useState(false);
  const [message, setMessage] = useState("");

  const handleScan = async (result) => {
    if (!result || scanned) return;

    try {
      const qrData = JSON.parse(result[0].rawValue); 
      const { sessionId } = qrData;

    
      const sessionRef = doc(db, "attendanceSessions", sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        setMessage("❌ Invalid or expired QR code.");
        return;
      }

      const sessionData = sessionSnap.data();
      if (!sessionData.isActive) {
        setMessage("⚠️ This attendance session is closed.");
        return;
      }

      // Mark attendance
      await addDoc(collection(db, "attendance"), {
        studentUid: user.uid,
        studentId: user.studentId || "N/A",
        studentName: user.name || "Unknown",
        lecturerId: sessionData.lecturerId,
        courseName: sessionData.courseName,
        courseId: sessionData.courseId || "",
        timestamp: serverTimestamp(),
        status: "present",
        sessionId,
      });

     
      await updateDoc(sessionRef, {
        attendees: arrayUnion(user.uid),
      });

      setScanned(true);
      setMessage("✅ Attendance marked successfully!");
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to mark attendance.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Scan Attendance QR</h1>

      {!scanned && (
        <QrScanner
          onDecode={handleScan}
          onError={(err) => console.error(err)}
          style={{ width: "100%" }}
        />
      )}

      {message && (
        <p className={`mt-4 text-lg ${message.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
