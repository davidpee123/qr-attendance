import Sidebar from "@/components/Sidebar";
import { FaBook, FaUsers, FaUserGraduate } from "react-icons/fa";

export default function AdminDashboard() {
  const adminMenu = [
    { icon: <FaBook />, label: "Add Course", link: "/admin/add-course" },
    { icon: <FaUsers />, label: "Manage Lecturers", link: "/admin/lecturers" },
    { icon: <FaUserGraduate />, label: "Manage Students", link: "/admin/students" },
  ];

  return (
    <div className="flex">
      {/* Sidebar */}
      <Sidebar menuItems={adminMenu} />

      {/* Main content */}
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <p>Welcome Admin! Use the sidebar to manage courses, lecturers, and students.</p>
      </main>
    </div>
  );
}

