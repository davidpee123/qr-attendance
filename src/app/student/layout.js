"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { FaQrcode, FaUserGraduate } from "react-icons/fa";
import { MdOutlineDashboard } from "react-icons/md";

export default function StudentLayout({ children }) {
  // Navigation items
  const menuItems = [
    {
      label: "Dashboard",
      link: "/student",
      icon: <MdOutlineDashboard />,
    },
    {
      label: "Scan QR",
      link: "/student/scan",
      icon: <FaQrcode />,
    },
    {
      label: "Profile",
      link: "/student/profile",
      icon: <FaUserGraduate />,
    },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Mobile Bottom Navbar */}
      

      {/* Sidebar for Desktop */}
      <Sidebar menuItems={menuItems} />

      {/* Main Content */}
      <main className="flex-1 main-content-bg overflow-y-auto p-4">
        {children}
      </main>
    </div>
  );
}
