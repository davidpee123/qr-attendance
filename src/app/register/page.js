"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();
    console.log("Registering:", { name, email, password });
    // Later: Add Firebase signup logic here
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: "url('/banner_new.png')", // put your image in public/register-bg.jpg
      }}
    >
      <div className="bg-white/20 backdrop-blur-md p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-[#f5ae24]">
          Create Account
        </h1>
        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-white/30 text-white placeholder-white focus:outline-none focus:ring-2 focus:ring-[#4d2f90]"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-white/30 text-white placeholder-white focus:outline-none focus:ring-2 focus:ring-[#4d2f90]"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-white/30 text-white placeholder-white focus:outline-none focus:ring-2 focus:ring-[#4d2f90]"
            required
          />
          <button
            type="submit"
            className="w-full bg-[#4d2f90] hover:bg-[#8664A8] text-white py-2 rounded-lg transition"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
}

