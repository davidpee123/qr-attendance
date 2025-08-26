"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { auth, db } from '@/lib/firebase/firebaseConfig';
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore"; // Import 'setDoc' to write to a specific document path
import { useAuth } from "@/hooks/useAuth";

// Import QR scanner dynamically so it works with Next.js
const QrScanner = dynamic(() => import("@yudiel/react-qr-scanner"), { ssr: false });

export default function StudentQRScanner() {
  const { user } = useAuth();
  const [scanned, setScanned] = useState(false);
  const [message, setMessage] = useState("");

  const handleScan = async (result) => {
    if (!result || scanned) return;

    try {
      const qrData = JSON.parse(result[0].rawValue);
      const { sessionId } = qrData;

      // Check the session document and its status
      const sessionRef = doc(db, "qr_sessions", sessionId); // Changed 'attendanceSessions' to 'qr_sessions'
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        setMessage("❌ Invalid or expired QR code.");
        return;
      }

      const sessionData = sessionSnap.data();
      if (!sessionData.active) { // Changed `isActive` to `active` to match the image you showed
        setMessage("⚠️ This attendance session is closed.");
        return;
      }

      // **Critical Change:** Save attendance to the 'students' subcollection
      const studentAttendanceRef = doc(db, "qr_sessions", sessionId, "students", user.uid);
      const studentAttendanceSnap = await getDoc(studentAttendanceRef);

      if (studentAttendanceSnap.exists()) {
        setMessage("⚠️ You have already marked attendance for this session.");
        setScanned(true);
        return;
      }

      // Set the document in the subcollection. `setDoc` is used to write to a specific path.
      await setDoc(studentAttendanceRef, {
        id: user.uid, // The 'id' field your dashboard query expects
        timestamp: new Date(), // Use `new Date()` instead of `serverTimestamp()` for a simpler object
      });

      // Optionally, update the main session document with the number of attendees
      await updateDoc(sessionRef, {
        numberOfAttendees: (sessionData.numberOfAttendees || 0) + 1,
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