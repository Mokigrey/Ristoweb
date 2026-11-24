
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();

      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        setError(error.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Impossibile effettuare l'accesso.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!email.trim()) {
      setError("Inserisci prima il tuo indirizzo email.");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo:
              `${window.location.origin}/reset-password`,
          }
        );

      if (error) {
        setError(error.message);
      } else {
        setMessage(
          "Se l'indirizzo è registrato, riceverai un'email per reimpostare la password."
        );
      }
    } catch {
      setError("Impossibile inviare la richiesta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-white rounded-xl shadow p-8 space-y-5"
      >
        <h1 className="text-3xl font-bold text-gray-900">
          RistoWeb
        </h1>

        <p className="text-gray-600">
          Accedi al pannello di gestione
        </p>

        <div>
          <label
            htmlFor="email"
            className="block mb-2 text-gray-800"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg p-3 text-gray-900"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block mb-2 text-gray-800"
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg p-3 text-gray-900"
          />
        </div>

        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}

        {message && (
          <p role="status" className="text-green-700">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-700 text-white rounded-lg p-3 disabled:opacity-50"
        >
          {loading ? "Attendere..." : "Accedi"}
        </button>

        <button
          type="button"
          onClick={resetPassword}
          disabled={loading}
          className="w-full text-emerald-700 hover:underline disabled:opacity-50"
        >
          Password dimenticata?
        </button>
      </form>
    </main>
  );
}
