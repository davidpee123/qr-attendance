"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link href="/scan" className="bg-green-500 text-white p-6 rounded-lg shadow hover:bg-green-600 transition text-center">
          📷 Student QR Scanner
        </Link>
        
        <Link href="/generate" className="bg-blue-500 text-white p-6 rounded-lg shadow hover:bg-blue-600 transition text-center">
          🎯 Lecturer QR Generator
        </Link>
      </div>
    </div>
  );
}






