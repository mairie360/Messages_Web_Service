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
        <>
          {session.error && (
            <p role="alert" className="messages-error">
              {session.error}
            </p>
          )}
          <UserProfile
            user={session.user}
            editable={false}
            subtitle={
              session.loading
                ? "Chargement du compte connecté"
                : "Informations réelles du compte connecté"
            }
          />
        </>
      )}
    </AppShell>
  );
}
