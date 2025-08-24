// src/lib/firebase/attendance.js

import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";

// Helper function to calculate distance in meters using Haversine formula
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in meters
}

export async function markAttendance(sessionData, currentUser, currentStudentLocation, setMessage, setScanResult) {
  try {
    // Ensure latitude and longitude are valid numbers
    const studentLat = currentStudentLocation.latitude;
    const studentLon = currentStudentLocation.longitude;
    const classLocation = sessionData.location;

    // Correct the distance check
    const distance = getDistanceFromLatLonInM(studentLat, studentLon, classLocation.latitude, classLocation.longitude);
    const MAX_DISTANCE_METERS = 28000;

    if (distance > MAX_DISTANCE_METERS) {
      setMessage(`❌ You are not at the class location. Attendance not allowed. (${distance.toFixed(2)}m away)`);
      return;
    }

    // Mark attendance
    await setDoc(
      doc(db, "attendance", sessionData.sessionId, "students", currentUser.uid),
      {
        studentId: currentUser.uid,
        studentEmail: currentUser.email,
        sessionId: sessionData.sessionId,
        courseName: sessionData.courseName,
        timestamp: serverTimestamp(),
        markedLocation: { lat: studentLat, lon: studentLon }
      },
      { merge: true }
    );

    setMessage(`✅ Attendance successfully marked for ${sessionData.courseName}!`);
    setScanResult(null);

  } catch (error) {
    console.error("Error marking attendance:", error);
    setMessage("⚠️ Failed to mark attendance. Please try again.");
  }
}