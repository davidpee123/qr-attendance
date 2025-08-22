"use client";
import { useMemo, useState } from "react";

export default function AttendanceTable({ rows }) {
  // rows = [{studentName, studentId, courseName, timestamp, status}]
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const courses = useMemo(() => {
    const set = new Set(rows.map(r => r.courseName).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [rows]);

  const filtered = rows.filter(r => {
    const matchText =
      r.studentName?.toLowerCase().includes(query.toLowerCase()) ||
      r.studentId?.toLowerCase().includes(query.toLowerCase()) ||
      r.courseName?.toLowerCase().includes(query.toLowerCase());
    const matchCourse = courseFilter === "all" || r.courseName === courseFilter;
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchText && matchCourse && matchStatus;
  });

  return (
    <div className="bg-white rounded-xl p-5 shadow">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
        <input
          className="border rounded px-3 py-2 w-full md:w-1/3"
          placeholder="Search name / ID / course..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="flex gap-2">
          <select
            className="border rounded px-3 py-2"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            {courses.map(c => <option key={c} value={c}>{c === "all" ? "All Courses" : c}</option>)}
          </select>
          <select
            className="border rounded px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-600">
            <tr>
              <th className="py-2">Student</th>
              <th>Student ID</th>
              <th>Course</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((r, i) => (
              <tr key={i}>
                <td className="py-2">{r.studentName || "-"}</td>
                <td>{r.studentId || "-"}</td>
                <td>{r.courseName || "-"}</td>
                <td>{r.timestamp?.toDate ? r.timestamp.toDate().toLocaleString() : "-"}</td>
                <td className={r.status === "present" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                  {r.status}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td className="py-6 text-center text-gray-500" colSpan={5}>No records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
