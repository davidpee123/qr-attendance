"use client";

import Layout from "@/components/layout";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore"; // Import updateDoc
import { auth, db } from '@/lib/firebase/firebaseConfig'; // Ensure this path is correct
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Import Storage functions
import { updateProfile } from "firebase/auth"; 

export default function StudentProfile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false); 

  // States for editable fields
  const [editFullName, setEditFullName] = useState("");
  const [editPronoun, setEditPronoun] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStudentId, setEditStudentId] = useState("");
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Initialize Firebase Storage
  const storage = typeof window !== 'undefined' ? getStorage() : null;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setProfileData(data);
          // Initialize edit states with current profile data
          setEditFullName(user.displayName || data.displayName || "");
          setEditPronoun(data.pronoun || "");
          setEditPhone(data.phone || "");
          setEditStudentId(data.studentId || "");
        } else {
          setError("No profile data found for this user.");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Function to handle saving updated profile data
  const handleSaveProfile = async () => {
    if (!user) {
      alert("User not authenticated.");
      return;
    }
    setUploadingImage(true);

    let photoURL = profileData?.photoURL || "";

    // Handle image upload if a new file is selected
    if (editPhotoFile && storage) {
      try {
        const storageRef = ref(storage, `profile_pictures/${user.uid}/${editPhotoFile.name}`);
        const snapshot = await uploadBytes(storageRef, editPhotoFile);
        photoURL = await getDownloadURL(snapshot.ref);
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError);
        alert("Failed to upload image. Please try again.");
        setUploadingImage(false);
        return;
      }
    }
    setUploadingImage(false);

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        displayName: editFullName,
        pronoun: editPronoun,
        phone: editPhone,
        studentId: editStudentId,
        photoURL: photoURL,
      });

      // Also update Firebase Authentication's displayName (if it changed)
      if (user.displayName !== editFullName) {
        await updateProfile(user, { displayName: editFullName }); // <--- This is the line causing the error
      }

      // Update local state to reflect changes immediately
      setProfileData(prevData => ({
        ...prevData,
        displayName: editFullName,
        pronoun: editPronoun,
        phone: editPhone,
        studentId: editStudentId,
        photoURL: photoURL,
      }));
      setShowEditModal(false);
      setEditPhotoFile(null);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile. Please try again.");
    }
  };

  // Handle file selection for profile picture
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setEditPhotoFile(e.target.files[0]);
    }
  };

  if (loading) {
    return (
      <Layout role="student">
        <div className="flex justify-center items-center h-full">
          <p className="text-gray-600 text-xl">Loading profile...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout role="student">
        <div className="flex justify-center items-center h-full text-red-600">
          <p className="text-xl">{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="student">
      <div className="p-6 bg-white rounded-lg shadow-md mt-12">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Student Profile</h1>

        {profileData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-4">
              {/* Student Profile Picture */}
              <img
                src={profileData.photoURL || `https://placehold.co/100x100/A0B9DE/000000?text=${user?.displayName?.charAt(0) || 'U'}`}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-blue-400"
                onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/100x100/A0B9DE/000000?text=U"; }}
              />
              <div>
                {/* Student Name */}
                <h2 className="text-2xl font-semibold text-gray-900">{user?.displayName || "N/A"}</h2>
                {/* Student Email */}
                <p className="text-gray-600">{user?.email || "N/A"}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-gray-700 font-medium">Role:</p>
                <p className="text-gray-900 capitalize">{profileData.role || "N/A"}</p>
              </div>
              <div>
                {/* Student ID */}
                <p className="text-gray-700 font-medium">Student ID:</p>
                <p className="text-gray-900">{profileData.studentId || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-700 font-medium">Major:</p>
                <p className="text-gray-900">{profileData.major || "N/A"}</p>
              </div>
              {/* Student Pronoun */}
              <div>
                <p className="text-gray-700 font-medium">Pronoun:</p>
                <p className="text-gray-900">{profileData.pronoun || "N/A"}</p>
              </div>
              {/* Student Phone Number */}
              <div>
                <p className="text-gray-700 font-medium">Phone Number:</p>
                <p className="text-gray-900">{profileData.phone || "N/A"}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">No profile data available. Please update your profile.</p>
        )}

        <div className="mt-8">
          <button
            onClick={() => setShowEditModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>

            {/* Profile Picture Upload Section */}
            <div className="mb-6 text-center">
              <label htmlFor="photoUpload" className="cursor-pointer">
                <img
                  src={
                    editPhotoFile
                    ? URL.createObjectURL(editPhotoFile)
                    : (profileData?.photoURL || `https://placehold.co/100x100/A0B9DE/000000?text=${user?.displayName?.charAt(0) || 'U'}`)
                  }
                  alt="Profile Preview"
                  className="w-24 h-24 rounded-full object-cover mx-auto mb-2 border-4 border-blue-400"
                  onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/100x100/A0B9DE/000000?text=U"; }}
                />
                <span className="text-blue-600 hover:underline">Upload Photo</span>
              </label>
              <input
                type="file"
                id="photoUpload"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {uploadingImage && <p className="text-sm text-gray-500 mt-2">Uploading image...</p>}
            </div>

            {/* Full Name Input */}
            <div className="mb-4">
              <label htmlFor="editFullName" className="block text-gray-700 text-sm font-bold mb-2">
                Full Name:
              </label>
              <input
                type="text"
                id="editFullName"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="editStudentId" className="block text-gray-700 text-sm font-bold mb-2">
                Student ID:
              </label>
              <input
                type="text"
                id="editStudentId"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={editStudentId}
                onChange={(e) => setEditStudentId(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="editPronoun" className="block text-gray-700 text-sm font-bold mb-2">
                Pronoun:
              </label>
              <input
                type="text"
                id="editPronoun"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={editPronoun}
                onChange={(e) => setEditPronoun(e.target.value)}
              />
            </div>
            <div className="mb-6">
              <label htmlFor="editPhone" className="block text-gray-700 text-sm font-bold mb-2">
                Phone Number:
              </label>
              <input
                type="text"
                id="editPhone"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowEditModal(false)}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                {uploadingImage ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}