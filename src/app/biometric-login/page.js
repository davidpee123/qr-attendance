'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import { motion } from "framer-motion";

export default function BiometricLogin() {
    const { currentUser, setCurrentUser, role, loading } = useAuth();
    const router = useRouter();
    const [message, setMessage] = useState("Please log in again on the main page to continue.");
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [isBiometricRegistered, setIsBiometricRegistered] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.PublicKeyCredential) {
            setIsBiometricSupported(true);
        }

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

    const base64UrlEncode = (buffer) => {
        return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };

    const base64UrlDecode = (str) => {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        const pad = str.length % 4;
        if (pad) {
            str += new Array(5 - pad).join('=');
        }
        return Uint8Array.from(atob(str), c => c.charCodeAt(0));
    };

    const handleBiometricRegistration = async () => {
        const pendingUserId = localStorage.getItem('pendingUserId');
        if (!pendingUserId) {
            setMessage("Error: No user found. Please log in again.");
            return;
        }

        try {
            const userDoc = await getDoc(doc(db, "users", pendingUserId));
            const userData = userDoc.data();

            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const publicKeyCredentialCreationOptions = {
                challenge: challenge,
                rp: { id: window.location.hostname, name: "LASU Attendance" },
                user: {
                    id: base64UrlDecode(pendingUserId),
                    name: userData.email,
                    displayName: userData.name,
                },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required",
                },
                timeout: 60000,
            };

            const credential = await navigator.credentials.create({
                publicKey: publicKeyCredentialCreationOptions,
            });

            const authenticatorData = credential.response.getAuthenticatorData();

            const credentialData = {
                id: base64UrlEncode(credential.rawId),
                publicKey: base64UrlEncode(credential.response.getPublicKey()),
                signCount: new DataView(authenticatorData).getUint32(29, false)
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
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const publicKeyCredentialRequestOptions = {
                challenge: challenge,
                allowCredentials: [{
                    type: "public-key",
                    id: base64UrlDecode(storedCred.id),
                }],
                userVerification: "required",
                timeout: 60000,
            };

            const assertion = await navigator.credentials.get({
                publicKey: publicKeyCredentialRequestOptions,
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