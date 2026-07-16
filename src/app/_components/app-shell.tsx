'use client';

import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Footer, Header, Sidebar } from "@mairie360/lib-components";
import { logoutAndReload, useAuthSession } from "@/lib/auth-session";
import { adminUser } from "./app-user";
import {
  Briefcase,
  Calendar,
  Files,
  GraduationCap,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Settings,
  Shield,
  UserRound,
} from "lucide-react";

type HeaderUser = ComponentProps<typeof Header>["user"];
type SidebarItem = NonNullable<ComponentProps<typeof Sidebar>["items"]>[number];

const sidebarItems: SidebarItem[] = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "projects", label: "Projets", icon: Briefcase },
  { id: "messages", label: "Messagerie", icon: MessageSquare },
  { id: "emails", label: "E-mails", icon: Mail },
  { id: "files", label: "Fichiers", icon: Files },
  { id: "training", label: "Formation", icon: GraduationCap },
  { id: "calendar", label: "Calendrier", icon: Calendar },
  { id: "admin", label: "Administration", icon: Shield, adminOnly: true, badge: "Admin" },
  { id: "profile", label: "Profil", icon: UserRound },
  { id: "settings", label: "Paramètres", icon: Settings },
];

const appRoutes: Partial<Record<string, string>> = {
  dashboard: process.env.LOGIN_FRONT_URL,
  projects: process.env.PROJECT_FRONT_URL,
  messages: process.env.MESSAGE_FRONT_URL,
  emails: process.env.EMAIL_FRONT_URL,
  files: process.env.FILES_FRONT_URL,
  training: process.env.ELEARNING_FRONT_URL,
  calendar: process.env.CALENDAR_FRONT_URL,
  admin: process.env.ADMINISTRATION_FRONT_URL,
  profile: "/profile",
};

type AppShellProps = {
  activeItem: string;
  children: ReactNode;
  user?: HeaderUser;
  isAdmin?: boolean;
  mainClassName?: string;
  mainInnerClassName?: string;
};

export function AppShell({
  activeItem,
  children,
  user,
  mainClassName = "",
  mainInnerClassName = "",
}: AppShellProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const session = useAuthSession(user ?? adminUser);

  const navigateToPage = (page: string) => {
    const route = appRoutes[page];

    if (route) {
      if (route.startsWith("/")) {
        router.push(route);
      } else {
        window.location.assign(route);
      }
    }

    setSidebarOpen(false);
  };

  const handleSidebarItemSelect: NonNullable<
    ComponentProps<typeof Sidebar>["onItemSelect"]
  > = (item) => {
    navigateToPage(item.id);
  };

  const renderSidebar = (className?: string) => (
    <Sidebar
      activeItem={activeItem}
      brandLogoSrc={null}
      className={className}
      isAdmin={session.isAdmin}
      items={sidebarItems}
      onItemSelect={handleSidebarItemSelect}
    />
  );

  return (
    <div className="messages-app-root">
      <div className="messages-shell">
        <div className="messages-desktop-sidebar">{renderSidebar()}</div>

        {sidebarOpen && (
          <div className="messages-mobile-sidebar">
            <button
              type="button"
              aria-label="Fermer la navigation"
              className="messages-mobile-sidebar-backdrop"
              onClick={() => setSidebarOpen(false)}
            />
            {renderSidebar("messages-mobile-sidebar-panel")}
          </div>
        )}

        <div className="messages-content">
          <Header
            user={session.user}
            isAdmin={session.isAdmin}
            setSidebarOpen={setSidebarOpen}
            profileHref="/profile"
            onPageChange={navigateToPage}
            onLogout={() => void logoutAndReload()}
          />

          <main className={`messages-main ${mainClassName}`}>
            <div className={`messages-main-inner ${mainInnerClassName}`}>
              {children}
            </div>
          </main>

          <Footer productName="Mairie360" year={2026} version="2.1.0" />
        </div>
      </div>
    </div>
  );
}
