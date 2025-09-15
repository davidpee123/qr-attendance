"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { FaUserGraduate, FaHistory } from "react-icons/fa";
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
      label: "History",
      link: "/student/history",
      icon: <FaHistory />,
    },
    {
      label: "Profile",
      link: "/student/profile",
      icon: <FaUserGraduate />,
    },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Mobile Bottom Navbar is commented out */}
      

      {/* Sidebar for Desktop */}
      <Sidebar menuItems={menuItems} />

      {/* Main Content */}
      <main className="flex-1 main-content-bg overflow-y-auto ">
        {children}
      </main>
    </div>
  );
}