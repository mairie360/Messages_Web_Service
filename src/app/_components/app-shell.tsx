'use client';

import { getAppRoute } from "@/lib/navigation";
import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Footer, Header, Sidebar } from "@mairie360/lib-components";
import {
  logoutAndReload,
  useAuthSession,
  type AuthSession,
} from "@/lib/auth-session";
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

type AppShellProps = {
  activeItem: string;
  children: ReactNode | ((session: AuthSession) => ReactNode);
  boundedContent?: boolean;
  mainClassName?: string;
  mainInnerClassName?: string;
};

export function AppShell({
  activeItem,
  children,
  boundedContent = false,
  mainClassName = "",
  mainInnerClassName = "",
}: AppShellProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const session = useAuthSession();

  const navigateToPage = (page: string) => {
    const route = getAppRoute(page);

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
    <div className={boundedContent ? "messages-app-root messages-app-root--bounded" : "messages-app-root"}>
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
              {typeof children === "function" ? children(session) : children}
            </div>
          </main>

          <Footer productName="Mairie360" year={2026} version="2.1.0" />
        </div>
      </div>
    </div>
  );
}
