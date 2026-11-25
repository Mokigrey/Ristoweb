"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputStyle = "mt-2 w-full rounded-lg border p-3 font-normal text-gray-900";

export default function RegistrationForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || submitted) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email") ?? "").trim();
    const password = String(fields.get("password") ?? "");
    if (password !== fields.get("confirm_password")) {
      setError("Le password non coincidono.");
      return;
    }
    if (password.length < 12 || new TextEncoder().encode(password).length > 72) {
      setError("Scegli una password di almeno 12 caratteri. Se usi molti simboli o emoji, riduci la lunghezza.");
      return;
    }

    setPending(true);
    setError("");
    try {
      const { data, error: signupError } = await createClient().auth.signUp({
        email, password,
        options: { emailRedirectTo: new URL("/auth/conferma", window.location.origin).href },
      });
      if (signupError && signupError.code !== "user_already_exists") {
        setError(
          signupError.code === "over_email_send_rate_limit" || signupError.code === "over_request_rate_limit"
            ? "Hai fatto troppi tentativi. Attendi qualche minuto e riprova."
            : "Non siamo riusciti a completare la registrazione. Verifica i dati o riprova più tardi.",
        );
        return;
      }
      if (data.session) {
        router.replace("/cliente/nuovo");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Impossibile completare la registrazione. Controlla la connessione e riprova.");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-950">
        <p className="font-semibold">Controlla la posta</p>
        <p className="mt-1">Se l’indirizzo è disponibile, riceverai un link. Aprilo nello stesso browser per continuare.</p>
        <button type="button" onClick={() => setSubmitted(false)} className="mt-3 font-medium underline">
          Usa un altro indirizzo
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={register} className="space-y-4">
      <fieldset disabled={pending} className="space-y-4">
        <label className="block font-medium">
          Email
          <input name="email" type="email" autoComplete="email" required maxLength={254} className={inputStyle} />
        </label>
        <label className="block font-medium">
          Password
          <input name="password" type="password" autoComplete="new-password" aria-describedby="password-hint" required minLength={12} maxLength={72} className={inputStyle} />
        </label>
        <p id="password-hint" className="text-sm text-gray-600">Usa almeno 12 caratteri.</p>
        <label className="block font-medium">
          Conferma password
          <input name="confirm_password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} className={inputStyle} />
        </label>
      </fieldset>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white hover:bg-emerald-800 disabled:opacity-50">
        {pending ? "Registrazione…" : "Registrati"}
      </button>
    </form>
  );
}
