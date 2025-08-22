"use client";

import Layout from "@/components/layout";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore"; // Import deleteDoc
import { auth, db } from '@/lib/firebase/firebaseConfig';// Import your Firebase db instance
import {
  updatePassword, // <-- Import for changing password
  deleteUser,     // <-- Import for deleting user
  EmailAuthProvider, // <-- For re-authentication
  reauthenticateWithCredential // <-- For re-authentication
} from "firebase/auth"; // Import from firebase/auth

export default function SettingsPage() {
  const { user } = useAuth();
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [theme, setTheme] = useState("light");
  const [loadingSettings, setLoadingSettings] = useState(true);

  // States for password change modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // States for delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const userRole = user?.role || "student";

  // Effect to load settings from Firestore
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) {
        setLoadingSettings(false);
        return;
      }
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setNotificationEnabled(userData.notificationEnabled || true);
          setTheme(userData.theme || "light");
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchSettings();
  }, [user]);

  // Effect to apply the theme class to the HTML element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const htmlElement = document.documentElement;
      if (theme === "dark") {
        htmlElement.classList.add("dark");
      } else {
        htmlElement.classList.remove("dark");
      }
    }
  }, [theme]);

  // Handle saving general settings (notifications, theme)
  const handleSaveSettings = async () => {
    if (!user) {
      console.error("User not authenticated. Cannot save settings.");
      // alert("User not authenticated. Cannot save settings."); // Replaced with console.error
      return;
    }
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        notificationEnabled: notificationEnabled,
        theme: theme,
      });
      alert("Settings saved successfully!"); // Consider a custom modal
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again."); // Consider a custom modal
    }
  };

  // Handle changing password
  const handleChangePassword = async () => {
    setPasswordError(""); // Clear previous errors

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (!user) {
      setPasswordError("User not authenticated.");
      return;
    }

    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      alert("Password updated successfully!"); // Consider a custom modal
      setShowPasswordModal(false); // Close modal
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      // More user-friendly error messages based on Firebase error codes
      if (error.code === 'auth/wrong-password') {
        setPasswordError("Incorrect current password.");
      } else if (error.code === 'auth/requires-recent-login') {
        setPasswordError("Please log out and log in again to update your password.");
      } else {
        setPasswordError("Failed to update password. Please try again.");
      }
    }
  };

  // Handle deleting account
  const handleDeleteAccount = async () => {
    setDeleteError(""); // Clear previous errors

    if (!user) {
      setDeleteError("User not authenticated.");
      return;
    }

    try {
      // Re-authenticate user before deleting account
      const credential = EmailAuthProvider.credential(user.email, deleteConfirmPassword);
      await reauthenticateWithCredential(user, credential);

      // Delete user document from Firestore first (optional, but good practice)
      await deleteDoc(doc(db, "users", user.uid));

      // Delete user from Firebase Authentication
      await deleteUser(user);

      alert("Account deleted successfully!"); 
    } catch (error) {
      console.error("Error deleting account:", error);
      if (error.code === 'auth/wrong-password') {
        setDeleteError("Incorrect password.");
      } else if (error.code === 'auth/requires-recent-login') {
        setDeleteError("Please log out and log in again to delete your account.");
      } else {
        setDeleteError("Failed to delete account. Please try again.");
      }
    }
  };


  if (loadingSettings) {
    return (
      <Layout role={userRole}>
        <div className="flex justify-center items-center h-full">
          <p className="text-gray-600 text-xl">Loading settings...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role={userRole}>
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Settings</h1>

        <div className="space-y-6">
          {/* General Settings Section */}
          <div>
            <h2 className="text-2xl font-semibold mb-3 text-gray-700">General</h2>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
              <label htmlFor="notifications" className="text-gray-800">Enable Notifications</label>
              <input
                type="checkbox"
                id="notifications"
                className="toggle toggle-primary"
                checked={notificationEnabled}
                onChange={() => setNotificationEnabled(!notificationEnabled)}
              />
            </div>
          </div>

          {/* Appearance (Theme) Settings Section */}
          <div>
            <h2 className="text-2xl font-semibold mb-3 text-gray-700">Appearance</h2>
            <div className="p-4 bg-gray-50 rounded-md">
              <label htmlFor="theme" className="block text-gray-800 mb-2">Select Theme:</label>
              <select
                id="theme"
                className="w-full p-2 border rounded-md"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>

          {/* Account Settings Section (Password, Delete Account) */}
          <div>
            <h2 className="text-2xl font-semibold mb-3 text-gray-700">Account</h2>
            <div className="space-y-4">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="w-full bg-[#0c3246] text-white px-4 py-2 rounded-md hover:bg-[#12161B] transition-colors duration-200"
              >
                Change Password
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors duration-200"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Save General Settings Button */}
        <div className="mt-8 text-right">
          <button
            onClick={handleSaveSettings}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            Save Settings
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Change Password</h2>
            {passwordError && <p className="text-red-500 text-sm mb-4">{passwordError}</p>}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="currentPassword">
                Current Password:
              </label>
              <input
                type="password"
                id="currentPassword"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newPassword">
                New Password:
              </label>
              <input
                type="password"
                id="newPassword"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmNewPassword">
                Confirm New Password:
              </label>
              <input
                type="password"
                id="confirmNewPassword"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError(""); // Clear error on close
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmNewPassword("");
                }}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-red-600">Delete Account</h2>
            {deleteError && <p className="text-red-500 text-sm mb-4">{deleteError}</p>}
            <p className="mb-4 text-gray-700">
              Are you sure you want to delete your account? This action is irreversible.
            </p>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="deleteConfirmPassword">
                Confirm with your password:
              </label>
              <input
                type="password"
                id="deleteConfirmPassword"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={deleteConfirmPassword}
                onChange={(e) => setDeleteConfirmPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(""); // Clear error on close
                  setDeleteConfirmPassword("");
                }}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
