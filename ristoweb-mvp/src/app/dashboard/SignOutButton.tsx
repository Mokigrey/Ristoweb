"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button onClick={logout} className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-800 hover:bg-gray-50">
      Esci
    </button>
  );
}
