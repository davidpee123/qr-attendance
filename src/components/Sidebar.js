"use client";

import { useState } from "react";
import Link from "next/link";
import { FaCog } from "react-icons/fa";
import { MdOutlineDashboard } from "react-icons/md";

export default function Sidebar({ menuItems }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Mobile Navbar (visible on small screens) */}
      <div className="fixed top-0 left-0 w-full bg-[#eceadc] shadow-lg md:hidden">
        <div className="flex justify-around items-center h-16">
          {/* This is the new header for mobile */}
          <div className="flex items-center gap-2">
            <MdOutlineDashboard size={28} />
            <span className="font-bold text-lg"></span>
          </div>

          {/* Navigation links for mobile */}
          {menuItems.map((item, index) => (
            <Link
              key={index}
              href={item.link}
              className="flex flex-col items-center justify-center p-2 text-gray-500 hover:text-green-600 transition-colors"
            >
              <span className="text-sm font-semibold">{item.label}</span>
            </Link>
          ))}
          
          {/* Settings link for mobile */}
          <Link
            href="/settings"
            className="flex flex-col items-center justify-center p-2 text-gray-500 hover:text-green-600 transition-colors"
          >
            <span className="text-sm font-semibold">Settings</span>
          </Link>
        </div>
      </div>

      {/* Desktop Sidebar (visible on medium screens and up) */}
      <div
        className={`h-screen bg-[#eceadc] text-black transition-all duration-300 flex flex-col ${expanded ? "w-48" : "w-16"} hidden md:flex`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {/* The old desktop header is here, no changes needed for this part */}
        <div className="flex items-center justify-center h-16 border-b border-gray-700">
          <MdOutlineDashboard size={28} />
        </div>

        {/* Menu Items */}
        <nav className="flex-1 mt-4">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              href={item.link}
              className="flex items-center gap-4 px-4 py-3 hover:underline transition-colors"
            >
              {item.icon}
              {expanded && <span className="text-lg">{item.label}</span>}
            </Link>
          ))}
        </nav>
        {/* Footer / Settings */}
        <div className="border-t border-gray-700">
          <Link
            href="/settings"
            className="flex items-center gap-4 px-4 py-3 hover:bg-[#df2b31]"
          >
            <FaCog />
            {expanded && <span className="text-lg text-[#00a63e]">Settings</span>}
          </Link>
        </div>
      </div>
    </>
  );
}