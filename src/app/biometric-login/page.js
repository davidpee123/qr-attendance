'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import { motion } from "framer-motion";

// Import the SimpleWebAuthn library
import * as SimpleWebAuthnBrowser from "@simplewebauthn/browser";

export default function BiometricLogin() {
    const { currentUser, setCurrentUser, role, loading } = useAuth();
    const router = useRouter();
    const [message, setMessage] = useState("Please log in again on the main page to continue.");
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [isBiometricRegistered, setIsBiometricRegistered] = useState(false);

    useEffect(() => {
        // SimpleWebAuthn has its own support check
        setIsBiometricSupported(SimpleWebAuthnBrowser.browserSupportsWebAuthn());

        const pendingUserId = localStorage.getItem('pendingUserId');
        if (pendingUserId) {
            const checkUserRole = async () => {
                const userDoc = await getDoc(doc(db, "users", pendingUserId));
                if (userDoc.exists() && userDoc.data().role === 'student') {
                    setMessage("Verifying biometric registration status...");
                    const credDoc = await getDoc(doc(db, "biometric_credentials", pendingUserId));
                    setIsBiometricRegistered(credDoc.exists());
                    if (credDoc.exists()) {
                        setMessage("Please authenticate with your biometrics to continue.");
                    } else {
                        setMessage("It looks like this is your first time logging in. Please register your biometric ID to continue.");
                    }
                } else {
                    router.push('/login');
                }
            };
            checkUserRole();
        } else if (!currentUser) {
            router.push('/login');
        } else if (role !== 'student') {
            router.push('/lecturer');
        }
    }, [currentUser, role, router]);

    const handleBiometricRegistration = async () => {
        const pendingUserId = localStorage.getItem('pendingUserId');
        if (!pendingUserId) {
            setMessage("Error: No user found. Please log in again.");
            return;
        }

        try {
            const userDoc = await getDoc(doc(db, "users", pendingUserId));
            const userData = userDoc.data();

            // Use the library's function to generate the credential
            const credential = await SimpleWebAuthnBrowser.startRegistration({
                rp: { id: window.location.hostname, name: "LASU Attendance" },
                user: {
                    id: pendingUserId, // The library handles the encoding
                    name: userData.email,
                    displayName: userData.name,
                },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required",
                },
            });

            // The library returns a structured JSON object
            const credentialData = {
                id: credential.id,
                publicKey: credential.response.getPublicKey, // This is still wrong
                authenticatorData: credential.response.authenticatorData,
                clientDataJSON: credential.response.clientDataJSON,
            };

            await setDoc(doc(db, "biometric_credentials", pendingUserId), credentialData);
            
            setMessage("Biometric registration successful! Redirecting to your dashboard...");
            localStorage.removeItem('pendingUserId');
            setCurrentUser({ uid: pendingUserId, role: 'student', ...userData });
            router.push('/student');

        } catch (error) {
            console.error("Biometric registration failed:", error);
            setMessage(`Registration failed: ${error.message}. Please try again.`);
        }
    };

    const handleBiometricLogin = async () => {
        const pendingUserId = localStorage.getItem('pendingUserId');
        if (!pendingUserId) {
            setMessage("Error: No user found. Please log in again.");
            return;
        }

        try {
            const credentialDoc = await getDoc(doc(db, "biometric_credentials", pendingUserId));
            if (!credentialDoc.exists()) {
                setMessage("Biometric credential not found. Please register it first.");
                return;
            }

            const storedCred = credentialDoc.data();
            
            // Use the library's function to create the assertion
            const assertion = await SimpleWebAuthnBrowser.startAuthentication({
                challenge: 'replace-with-a-real-challenge', // A unique challenge is needed
                allowCredentials: [{
                    type: 'public-key',
                    id: storedCred.id,
                }],
                userVerification: 'required',
            });
            
            setMessage("Biometric authentication successful! Redirecting to your dashboard...");
            localStorage.removeItem('pendingUserId');
            const userDoc = await getDoc(doc(db, "users", pendingUserId));
            setCurrentUser({ uid: pendingUserId, ...userDoc.data() });
            router.push('/student');
            
        } catch (error) {
            console.error("Biometric login failed:", error);
            setMessage(`Authentication failed: ${error.message}. Please try again.`);
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <motion.div
                className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm"
                initial="hidden"
                animate="visible"
                variants={cardVariants}
            >
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
                    Biometric Verification
                </h2>
                <p className="text-sm text-center text-gray-600 mb-6">{message}</p>
                {isBiometricSupported ? (
                    isBiometricRegistered ? (
                        <button
                            onClick={handleBiometricLogin}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-300"
                        >
                            <span className="flex items-center justify-center">
                                Authenticate
                            </span>
                        </button>
                    ) : (
                        <button
                            onClick={handleBiometricRegistration}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-300"
                        >
                            <span className="flex items-center justify-center">
                                Register Biometric ID
                            </span>
                        </button>
                    )
                ) : (
                    <p className="text-red-500 text-sm text-center">
                        Your browser or device does not support biometric authentication. Please contact support.
                    </p>
                )}
            </motion.div>
        </div>
    );
}