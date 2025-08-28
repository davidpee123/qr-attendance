'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from '@/lib/firebase/firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
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
      
      // Update the message for the user to reflect successful registration
      setLoginError("Registration successful! You can now log in.");
      setIsRegister(false); // Switch to the login view after successful registration

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
        if (userData.role === 'student') {
            // Redirect students to the biometric verification page
            localStorage.setItem('pendingUserId', user.uid);
            router.push('/biometric-login');
        } else {
            // Lecturers are not required to do biometric verification
            redirectToDashboard(userData.role);
        }
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
              <li className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                  className="h-4 w-4 fill-current"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"/></svg>
                <span>Badagry Expressway, Ojo, Lagos, Nigeria</span>
              </li>
              <li className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                  className="h-4 w-4 fill-current"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.92 9h-3.1a15.9 15.9 0 0 0-1.15-5.13A8.03 8.03 0 0 1 18.92 11ZM12 4.06c.96 1.37 1.91 3.64 2.2 6.94H9.8c.29-3.3 1.24-5.57 2.2-6.94ZM7.33 5.87A15.9 15.9 0 0 0 6.18 11h-3.1a8.03 8.03 0 0 1 4.25-5.13ZM3.08 13h3.1c.14 1.83.63 3.61 1.15 5.13A8.03 8.03 0 0 1 3.08 13Zm6.72 0h4.4c-.29 3.3-1.24 5.57-2.2 6.94C11.24 18.57 10.29 16.3 9.8 13Zm7.79 0h3.1a8.03 8.03 0 0 1-4.25 5.13c.52-1.52 1.01-3.3 1.15-5.13Z"/></svg>
                <span>www.lasu.edu.ng</span>
              </li>
              <li className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                  className="h-4 w-4 fill-current"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z"/></svg>
                <span>registrar@lasu.edu.ng</span>
              </li>
              <li className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                  className="h-4 w-4 fill-current"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-1 12h-3.18a3 3 0 0 1-5.64 0H6V6h12v9Z"/></svg>
                <span>P.M.B. 0001, LASU Post Office, Ojo</span>
              </li>
            </motion.ul>
          </div>
        </motion.div>
      </div>

      {/* Login/Register Modal */}
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
                    <label className="block text-sm font-medium mb-2" htmlFor="roleSelect">
                      Register as:
                    </label>
                    <select
                      id="roleSelect"
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
                    <label className="block text-sm font-medium mb-2" htmlFor="studentNameInput">
                      Full Name:
                    </label>
                    <input
                      type="text"
                      id="studentNameInput"
                      placeholder="Enter your full name"
                      className="w-full p-2 border rounded"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                    />
                  </div>

                  {role === "student" && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2" htmlFor="matricNoInput">
                          Matric No.:
                        </label>
                        <input
                          type="text"
                          id="matricNoInput"
                          placeholder="Enter your matric no."
                          className="w-full p-2 border rounded"
                          value={matricNo}
                          onChange={(e) => setMatricNo(e.target.value)}
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2" htmlFor="courseInput">
                          Course:
                        </label>
                        <input
                          type="text"
                          id="courseInput"
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
              <input
                type="password"
                placeholder="Password"
                className="w-full p-2 mb-4 border rounded"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {isRegister ? (
                <button
                  onClick={handleRegister}
                  className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition"
                >
                  Register
                </button>
              ) : (
                <button
                  onClick={handleLogin}
                  className="w-full bg-[#428c6a] text-white py-2 rounded hover:bg-[#1e3d35] transition"
                >
                  Login
                </button>
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