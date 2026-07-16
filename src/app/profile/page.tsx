'use client';

import { UserProfile } from "@mairie360/lib-components";
import { AppShell } from "../_components/app-shell";

export default function ProfilePage() {
  return (
    <AppShell
      activeItem="profile"
      mainClassName="messages-main--scroll"
      mainInnerClassName="messages-main-inner--profile"
    >
      {(session) => (
        <UserProfile
          user={session.user}
          editable={false}
          loading={session.loading}
          error={session.error}
          subtitle="Informations réelles du compte connecté"
        />
      )}
    </AppShell>
  );
}
