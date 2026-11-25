
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const { data: listener } =
      supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY" && active) {
          setReady(true);
        }
      });

    async function checkRecovery() {
      const hash = new URLSearchParams(
        window.location.hash.substring(1)
      );

      const hasRecoveryToken =
        hash.get("type") === "recovery";

      const { data, error } =
        await supabase.auth.getSession();

      if (!active) return;

      if (error) {
        setMessage(error.message);
      } else if (hasRecoveryToken && data.session) {
        setReady(true);
      } else {
        setMessage(
          "Apri questa pagina tramite un link di recupero password valido."
        );
      }
    }

    checkRecovery();

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();

    if (!ready || password.length < 12) {
      setMessage("Inserisci almeno 12 caratteri.");
      return;
    }

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setSuccess(true);
      setMessage("Password aggiornata correttamente!");
      await supabase.auth.signOut();
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <form
        onSubmit={updatePassword}
        className="w-full max-w-md rounded-xl bg-white p-8 shadow space-y-5"
      >
        <h1 className="text-2xl font-bold text-gray-900">
          Nuova password RistoWeb
        </h1>

        {ready && !success && (
          <>
            <label className="block text-gray-800">
              Nuova password
            </label>

            <input
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg p-3 text-gray-900"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-700 text-white p-3 rounded-lg disabled:opacity-50"
            >
              {loading ? "Salvataggio..." : "Aggiorna password"}
            </button>
          </>
        )}

        {message && (
          <p role="status" className="text-gray-800">
            {message}
          </p>
        )}

        {success && (
          <a href="/login" className="text-emerald-700 underline">
            Torna al login
          </a>
        )}
      </form>
    </main>
  );
}
