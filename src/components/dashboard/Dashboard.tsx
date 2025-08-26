// src/components/dashboard/Dashboard.tsx
import React from "react";
import { NavLink, Routes, Route, useNavigate, useParams, Navigate } from "react-router-dom";

// Top bar + sidebar (already in your project)
import { ModernHeader } from "@/components/ui/modern-header";
import { ModernSidebar } from "@/components/ui/modern-sidebar";

// Dashboard sections (already in your project)
import { DashboardOverview } from "./DashboardOverview";
import { FormList } from "./FormList";
import { FormBuilder } from "./FormBuilder";
import { FormResponses } from "./FormResponses";
import { ProfileSettings } from "./ProfileSettings";
import { QRScanner } from "./QRScanner";
import { Documentation } from "./Documentation";

// Icons (optional — remove if you prefer text-only links)
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  MessageSquare,
  Shield,
  Settings,
  QrCode,
  BookOpen,
} from "lucide-react";

/**
 * Small wrapper so /dashboard/forms/:id renders FormBuilder
 * but URL param handling stays nicely contained.
 */
const FormBuilderByRoute: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <FormBuilder /* if your FormBuilder expects id via props, pass it here */ />;
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Sidebar links use <NavLink> so the URL changes and active state is styled.
  // TIP: If your ModernSidebar accepts items, you can keep using it;
  // below is a simple layout that works out of the box.
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top header */}
      <ModernHeader />

      <div className="flex">
        {/* Left sidebar */}
        <aside className="w-64 min-h-[calc(100vh-64px)] border-r">
          <nav className="p-3 space-y-1">
            <NavLink
              to="/dashboard/create"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md ${
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`
              }
            >
              <PlusCircle className="h-4 w-4" />
              Create Form
            </NavLink>

            <NavLink
              to="/dashboard/overview"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md ${
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`
              }
            >
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </NavLink>

            <NavLink
              to="/dashboard/forms"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md ${
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`
              }
            >
              <FileText className="h-4 w-4" />
              My Forms
            </NavLink>

            <NavLink
              to="/dashboard/responses"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md ${
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`
              }
            >
              <MessageSquare className="h-4 w-4" />
              Responses
            </NavLink>

            <NavLink
              to="/dashboard/docs"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md ${
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`
              }
            >
              <BookOpen className="h-4 w-4" />
              Documentation
            </NavLink>

            <NavLink
              to="/dashboard/scan"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md ${
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`
              }
            >
              <QrCode className="h-4 w-4" />
              Scan Form QR
            </NavLink>

            <NavLink
              to="/dashboard/settings"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md ${
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`
              }
            >
              <Settings className="h-4 w-4" />
              Settings
            </NavLink>
          </nav>

          {/* Optional upgrade block like your existing one */}
          <div className="p-3 mt-6">
            {/* If you have an existing upgrade component, render it here */}
            {/* <AccountUpgrade ... /> */}
            <div className="rounded-lg border p-3 text-sm">
              <div className="font-medium mb-1">Upgrade to Pro</div>
              <div className="text-muted-foreground">
                Unlock unlimited forms and advanced analytics.
              </div>
              <button
                className="mt-3 w-full rounded-md border px-3 py-2"
                onClick={() => navigate("/pricing")}
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </aside>

        {/* Right: content area for nested routes */}
        <main className="flex-1 min-h-[calc(100vh-64px)] overflow-auto p-6">
          <Routes>
            {/* Redirect /dashboard to /dashboard/overview */}
            <Route index element={<Navigate to="overview" replace />} />

            {/* Overview */}
            <Route path="overview" element={<DashboardOverview />} />

            {/* Create form can just render the builder in "new" mode,
               or a small wrapper that creates a draft then opens the builder. */}
            <Route path="create" element={<FormBuilder />} />

            {/* Forms list */}
            <Route path="forms" element={<FormList />} />

            {/* Form builder (edit mode) */}
            <Route path="forms/:id" element={<FormBuilderByRoute />} />

            {/* Responses */}
            <Route path="responses" element={<FormResponses />} />

            {/* Docs */}
            <Route path="docs" element={<Documentation />} />

            {/* QR Scanner */}
            <Route path="scan" element={<QRScanner />} />

            {/* Settings */}
            <Route path="settings" element={<ProfileSettings />} />

            {/* Fallback to overview for any unknown child path */}
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};
