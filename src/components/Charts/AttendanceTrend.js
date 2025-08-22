"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AttendanceTrend({ data }) {
  // data = [{ date: '2025-08-12', present: 22, total: 30, rate: 73 }, ...]
  return (
    <div className="bg-white rounded-xl p-5 shadow">
      <div className="mb-3 font-semibold">Attendance Trend (Last 30 Days)</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" hide />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="rate" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
