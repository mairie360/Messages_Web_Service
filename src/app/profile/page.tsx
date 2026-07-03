'use client';

import { useState } from "react";
import type { ComponentProps } from "react";
import { UserProfile } from "@mairie360/lib-components";
import { AppShell } from "../_components/app-shell";
import { adminUser } from "../_components/app-user";

type ProfileUser = NonNullable<ComponentProps<typeof UserProfile>["user"]>;

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileUser>(adminUser);

  return (
    <AppShell
      activeItem="profile"
      user={user}
      isAdmin
      mainClassName="messages-main--scroll"
      mainInnerClassName="messages-main-inner--profile"
    >
      <UserProfile user={user} onUpdateUser={setUser} />
    </AppShell>
  );
}
