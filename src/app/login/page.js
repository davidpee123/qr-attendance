'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from '@/lib/firebase/firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentName, setStudentName] = useState("");
  const [matricNo, setMatricNo] = useState("");
  const [course, setCourse] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false); 
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setShowModal(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const redirectToDashboard = (userRole) => {
    if (userRole === "lecturer") router.push("/lecturer");
    else if (userRole === "student") router.push("/student");
    else console.error("Role not assigned. Please contact admin.");
  };

  const handleRegister = async () => {
    setLoginError("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: studentName });
      
      await setDoc(doc(db, "users", user.uid), {
        role,
        name: studentName,
        email,
        matricNo,
        course,
        createdAt: new Date(),
      });
      
      setLoginError("Registration successful! You can now log in.");
      setIsRegister(false);

    } catch (err) {
      console.error("Registration error:", err.message);
      setLoginError(err.message);
    }
  };

  const handleLogin = async () => {
    setLoginError("");
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const userData = snap.data();
        redirectToDashboard(userData.role);
      } else {
        console.error("No user data found.");
        setLoginError("No user data found for your account.");
      }
    } catch (err) {
      console.error("Login error:", err.message);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setLoginError("Invalid email or password. Please try again.");
      } else {
        setLoginError(err.message);
      }
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setLoginError("Please enter your email to reset password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setLoginError("Password reset email sent. Please check your inbox.");
    } catch (err) {
      console.error("Password reset error:", err.message);
      setLoginError("Error sending password reset email.");
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.25, when: "beforeChildren" }
    }
  };
  const item = {
    hidden: { opacity: 0, x: 40 },
    show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div
      className="relative h-screen w-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/banner.jpeg')" }}
    >
      <div className="absolute inset-0 bg-black/40">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="h-full w-full flex items-center justify-end pr-6 md:pr-12"
        >
          <div className="max-w-[820px] w-full flex flex-col items-end gap-2 md:gap-3 text-right">
            <motion.div variants={item} className="flex items-center gap-2 md:gap-3">
              <Image
                src="/lasu-crest.png"
                alt="LASU Crest"
                width={48}
                height={48}
                className="h-10 w-10 md:h-12 md:w-12"
              />
              <span className="block text-[#1e3d35]/90 tracking-wide text-2xl md:text-2xl font-semibold uppercase">
                Lagos State
                <br />
                University
              </span>
            </motion.div>

            <motion.h1
              variants={item}
              className="text-3xl md:text-6xl font-extrabold leading-tight"
            >
              <span className="text-[#3f2a8c]">Lagos</span>{" "}
              <span className="text-[#f5ae24]">State</span>{" "}
              <span className="text-[#d7263d]">University</span>
            </motion.h1>

            <motion.p
              variants={item}
              className="italic text-black/90 text-lg md:text-2xl"
            >
              a citadel of learning …
            </motion.p>

            <motion.h1
              variants={item}
              className="text-2xl md:text-4xl font-extrabold leading-tight mt-2"
            >
              <span className="text-yellow-500">DEPARTMENT OF COMPUTER</span>
              <br />
              <span className="text-red-500">SCIENCE</span>
            </motion.h1>

            <motion.hr variants={item} className="w-full border-black/60 my-1 md:my-3" />

            <motion.ul
              variants={item}
              className="flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-6 text-black/90 text-[11px] md:text-sm"
            >
              <li className="flex items-center gap-2">📍 Badagry Expressway, Ojo, Lagos</li>
              <li className="flex items-center gap-2">🌐 www.lasu.edu.ng</li>
              <li className="flex items-center gap-2">📧 registrar@lasu.edu.ng</li>
              <li className="flex items-center gap-2">📬 P.M.B. 0001, LASU Post Office, Ojo</li>
            </motion.ul>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="bg-white rounded-lg shadow-lg w-full max-w-md p-6"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <h2 className="text-2xl font-bold mb-4 text-center">
                {isRegister ? "Register" : "Login"}
              </h2>
              {loginError && (
                <p className="text-red-500 text-sm text-center mb-4">{loginError}</p>
              )}

              {isRegister && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Register as:</label>
                    <select
                      className="w-full p-2 border rounded"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="student">Student</option>
                      <option value="lecturer">Lecturer</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Full Name:</label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      className="w-full p-2 border rounded"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                    />
                  </div>
                  {role === "student" && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Matric No.:</label>
                        <input
                          type="text"
                          placeholder="Enter your matric no."
                          className="w-full p-2 border rounded"
                          value={matricNo}
                          onChange={(e) => setMatricNo(e.target.value)}
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Course:</label>
                        <input
                          type="text"
                          placeholder="Enter your course"
                          className="w-full p-2 border rounded"
                          value={course}
                          onChange={(e) => setCourse(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              <input
                type="email"
                placeholder="Email"
                className="w-full p-2 mb-4 border rounded"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              {/* 👁️ Show/Hide Password */}
              <div className="relative mb-4">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="w-full p-2 border rounded pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>

              {isRegister ? (
                <button
                  onClick={handleRegister}
                  className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition"
                >
                  Register
                </button>
              ) : (
                <>
                  <button
                    onClick={handleLogin}
                    className="w-full bg-[#428c6a] text-white py-2 rounded hover:bg-[#1e3d35] transition"
                  >
                    Login
                  </button>

                  {/* 🔑 Forgot Password */}
                  <p className="text-sm text-center mt-3">
                    <button
                      onClick={handlePasswordReset}
                      className="text-blue-500 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </p>
                </>
              )}

              <p className="mt-4 text-sm text-center">
                {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-blue-500 hover:underline"
                >
                  {isRegister ? "Login" : "Register"}
                </button>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

