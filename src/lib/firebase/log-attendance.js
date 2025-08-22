import { db } from './firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

export const logAttendance = async (userId, userEmail, courseName, timestamp) => {
  try {
    const attendanceDocRef = doc(db, 'attendance', `${userId}_${timestamp}`);
    await setDoc(attendanceDocRef, {
      userId,
      userEmail,
      courseName,
      timestamp,
    });
    console.log('Attendance logged successfully!');
    return { success: true };
  } catch (error) {
    console.error('Error logging attendance:', error);
    return { success: false, message: error.message };
  }
};