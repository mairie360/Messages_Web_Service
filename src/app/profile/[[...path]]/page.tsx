import Link from "next/link";
import { redirect } from "next/navigation";
import { settingsProfileUrl } from "@/lib/settings-profile";

// The same image is promoted across instances; resolve the destination at request time.
export const dynamic = "force-dynamic";

export default function LegacyProfilePage() {
  const destination = settingsProfileUrl(process.env.SETTINGS_FRONT_URL);
  if (destination) redirect(destination);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6 py-10">
      <h1 className="text-2xl font-bold">Paramètres indisponibles</h1>
      <p role="alert">
        Le profil est géré dans Paramètres. Ce service n’est pas configuré
        correctement pour cette instance.
      </p>
      <Link className="font-medium underline underline-offset-4" href="/">
        Revenir au module
      </Link>
    </main>
  );
}
