import React, { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

type AppLayoutProps = {
  children: React.ReactNode;
  title: string;
};

export function AppLayout({ children, title }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar isOpen={sidebarOpen} onClose={toggleSidebar} />
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <Header onMenuClick={toggleSidebar} />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between pb-4 mb-4 border-b border-gray-200">
              <h1 className="text-2xl font-semibold text-gray-900 mb-4 md:mb-0">{title}</h1>
              {/* Additional header slot - can be rendered from children components */}
            </div>
            
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
