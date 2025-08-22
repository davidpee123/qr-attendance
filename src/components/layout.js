"use client";

// No longer needs Link or usePathname if it's just a wrapper
// import Link from "next/link";
// import { usePathname } from "next/navigation";

export default function Layout({ children, role }) {
  // Role-based menus and pathname are not needed here if this is just a wrapper
  // const pathname = usePathname();
  // const studentMenu = [
  //   { label: "Dashboard", link: "/student" },
  //   { label: "Scan QR", link: "/student/scan" },
  //   { label: "Profile", link: "/student/profile" },
  // ];
  // const lecturerMenu = [
  //   { label: "Dashboard", link: "/lecturer" },
  //   { label: "Generate QR", link: "/lecturer/qr" },
  //   { label: "Courses", link: "/lecturer/courses" },
  // ];
  // const menuItems = role === "student" ? studentMenu : lecturerMenu;

  return (
    <div className="flex">
      {/* The sidebar from the previous version is removed from here.
          Specific layouts (like student/lecturer) will now provide their own Sidebar component. */}

      {/* Main Content */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}