// src/components/Sidebar.js

"use client";

import { useState } from "react";
import Link from "next/link";
import { FaCog } from "react-icons/fa";
import { MdOutlineDashboard } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch } from "react-icons/fa";

export default function Sidebar({ menuItems }) {
  const [expanded, setExpanded] = useState(false); // desktop
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);// mobile
  const [showSearch, setShowSearch] = useState(false);

  // Variants for staggered animations
  const containerVariants = {
    open: { transition: { staggerChildren: 0.15 } },
    closed: {},
  };

  const itemVariants = {
    open: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 80 },
    },
    closed: { x: -20, opacity: 0, scale: 0.95 },
  };

  // Hamburger → X animation
  const HamburgerButton = ({ isOpen, toggle }) => (
    <button
      onClick={toggle}
      className="relative w-8 h-5 flex flex-col justify-between items-center"
    >
      <motion.span
        animate={isOpen ? { rotate: 45, y: 10 } : { rotate: 0, y: 0 }}
        className="w-6 h-1 bg-red-500 rounded"
      />
      <motion.span
        animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
        className="w-6 h-1 bg-red-500 rounded"
      />
      <motion.span
        animate={isOpen ? { rotate: -45, y: -10 } : { rotate: 0, y: 0 }}
        className="w-6 h-1 bg-red-500 rounded"
      />
    </button>
  );

  return (
    <>
      
      {/* Top Bar (Hamburger + Search) */}
      <div className="fixed top-0 left-0 w-full flex items-center bg-{#edeef0} shadow-md p-3 z-50 md:hidden">
        {/* Left: Hamburger */}
        <div className="flex-shrink-0">
          <HamburgerButton
            isOpen={isMobileSidebarOpen}
            toggle={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
          />
        </div>

        {/* Center: Search input (only appears when toggled) */}
        <div className="flex-grow mx-3">
          {showSearch && (
            <input
              type="text"
              placeholder="Search..."
              autoFocus
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-all duration-300"
            />
          )}
        </div>

        {/* Right: Search icon */}
        <div className="flex-shrink-0">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-full hover:bg-grey-50"
          >
            <FaSearch className="text-red-500" size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 70 }}
              className="fixed top-0 left-0 h-full w-56 bg-[#eceadc] text-black shadow-lg z-50 p-4 flex flex-col justify-between"
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-6">
                <MdOutlineDashboard size={28} className="text-red-500" />
                <span className="font-bold text-lg">Menu</span>
              </div>

              {/* Menu + Settings inside justify-between */}
              <div className="flex flex-col justify-between flex-1">
                <motion.nav
                  initial="closed"
                  animate="open"
                  exit="closed"
                  variants={containerVariants}
                  className="flex-1"
                >
                  {menuItems.map((item, index) => (
                    <motion.div key={index} variants={itemVariants}>
                      <Link
                        href={item.link}
                        onClick={() => setMobileSidebarOpen(false)}
                        className="flex items-center gap-4 px-4 py-3 hover:bg-gray-200 rounded-md"
                      >
                        <div className="text-red-500">{item.icon}</div>
                        <span className="text-lg">{item.label}</span>
                      </Link>
                    </motion.div>
                  ))}
                </motion.nav>

                {/* Settings naturally at bottom */}
                <motion.div variants={itemVariants} className="mt-4 border-t border-gray-300">
                  <Link
                    href="/settings"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-gray-200 rounded-md"
                  >
                    <FaCog size={20} className="text-red-500" />
                    <span className="text-lg">Settings</span>
                  </Link>
                </motion.div>
              </div>
            </motion.div>

            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.div
        animate={{ width: expanded ? 200 : 64 }}
        transition={{ type: "spring", stiffness: 120 }}
        className="h-screen bg-[#eceadc] text-black hidden md:flex flex-col shadow-lg"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div className="flex items-center justify-center h-16 border-b border-gray-700">
          <MdOutlineDashboard size={28} className="text-red-500" />
        </div>

        {/* Flex ensures Settings goes to bottom */}
        <div className="flex flex-col justify-between flex-1">
          <motion.nav
            initial="closed"
            animate={expanded ? "open" : "closed"}
            variants={containerVariants}
            className="mt-4 flex-1"
          >
            {menuItems.map((item, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Link
                  href={item.link}
                  className="flex items-center gap-4 px-4 py-3 hover:underline rounded-md"
                >
                  <div className="text-red-500">{item.icon}</div>
                  {expanded && <span className="text-lg">{item.label}</span>}
                </Link>
              </motion.div>
            ))}
          </motion.nav>

          {/* Settings at bottom with border */}
          <motion.div variants={itemVariants} className="border-t border-gray-300">
            <Link
              href="/settings"
              className="flex items-center gap-4 px-4 py-3 hover:bg-[#df2b31] rounded-md"
            >
              <FaCog size={20} className="text-red-500" />
              {expanded && <span className="text-lg text-black">Settings</span>}
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}