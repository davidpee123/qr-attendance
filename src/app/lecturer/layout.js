'use client';
import Link from 'next/link';

import { FaBook, FaHistory, FaQrcode } from "react-icons/fa";
import { MdOutlineDashboard } from "react-icons/md";
import Sidebar from "@/components/Sidebar";

export default function LecturerLayout({ children }) {
  const menuItems = [
    { label: "Dashboard", link: "/lecturer", icon: <MdOutlineDashboard /> },
    { label: "QR-code", link: "/lecturer/qr-generator", icon: <FaQrcode /> },
    { label: "History", link: "/lecturer/history", icon: <FaHistory /> },
    { label: "", link: "/lecturer/courses", icon: <FaBook /> },
  ];

  return (
     <div className="flex flex-col md:flex-row h-screen">
      <div className="md:hidden w-full bg-[#eceadc] p-4 flex justify-around items-center">
        {menuItems.map((item, index) => (
          <Link key={index} href={item.link}>
            <span className="text-2xl text-black">{item.icon}</span>
          </Link>
        ))}
      </div>
  <Sidebar menuItems={menuItems} />
  <main className="flex-1 main-content-bg overflow-y-auto">
    {children}
  </main>
</div>
  );
}