"use client"; 
import Link from 'next/link';

 import Sidebar from "@/components/Sidebar"; 
 import { FaQrcode, FaUserGraduate } from "react-icons/fa"; 
 import { MdOutlineDashboard } from "react-icons/md"; 

 export default function StudentLayout({ children }) { 
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
