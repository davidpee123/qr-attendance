"use client";

export default function Layout({ children, role }) {

  return (
    <div className="flex">
      <main className="flex-1">{children}</main>
    </div>
  );
}