import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";

export const markAttendance = async (sessionData, currentUser, markedLocation, setMessage, setScanResult) => {
  try {
    // Mark attendance without location checks
    await setDoc(
      doc(db, "attendance", sessionData.sessionId, "students", currentUser.uid),
      {
        studentId: currentUser.uid,
        studentEmail: currentUser.email,
        sessionId: sessionData.sessionId,
        courseName: sessionData.courseName,
        timestamp: serverTimestamp(),
        markedLocation: "No GPS Data"
      },
      { merge: true }
    );

    setMessage(`✅ Attendance successfully marked for ${sessionData.courseName}!`);
    setScanResult(null);

  } catch (error) {
    console.error("Error marking attendance:", error);
    setMessage(`⚠️ Failed to mark attendance: ${error.message}`);
  }
};