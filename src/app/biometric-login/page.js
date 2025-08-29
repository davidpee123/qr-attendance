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
                id: new TextEncoder().encode(pendingUserId),
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

        if (!credential || !credential.response) {
            setMessage("Biometric registration failed: User cancelled or an error occurred.");
            return;
        }

        const attestationResponse = credential.response;

        const credentialData = {
            id: base64UrlEncode(credential.rawId),
            clientDataJSON: base64UrlEncode(attestationResponse.clientDataJSON),
            attestationObject: base64UrlEncode(attestationResponse.attestationObject)
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
