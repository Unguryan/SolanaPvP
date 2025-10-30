// Main layout component
import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BottomNav } from "./BottomNav";

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">{children || <Outlet />}</main>

      <Footer />
      <BottomNav />
    </div>
  );
};
