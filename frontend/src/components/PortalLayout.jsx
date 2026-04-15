import { useState } from "react";

/**
 * Global Portal Layout Component
 * Provides a consistent layout structure for all portals (Student, Admin, Fee Manager)
 * 
 * Features:
 * - Fixed sidebar (250px)
 * - Flexible main content area
 * - No overlap on scroll or resize
 * - Mobile responsive with collapsible sidebar
 */
export default function PortalLayout({ sidebar, children, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-layout">
      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="app-layout-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`app-sidebar ${sidebarOpen ? "open" : "closed"}`}
      >
        {sidebar}
      </aside>

      {/* Main Content */}
      <main className="app-main-content">
        {/* Mobile Toggle Button */}
        <button
          className="app-sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          ☰
        </button>

        {/* Content Area */}
        <div className="app-content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
}
