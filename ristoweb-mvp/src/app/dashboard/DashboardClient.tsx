
"use client";

import Link from "next/link";
import SignOutButton from "./SignOutButton";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              RistoWeb
            </h1>
            <p className="text-gray-600">
              Pannello amministrativo
            </p>
          </div>

          <SignOutButton />
        </header>

        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Benvenuto nella dashboard
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-lg font-semibold text-gray-900">
              Attività
            </h3>
            <p className="text-gray-600 mt-2">
              Anagrafiche e vetrine dei clienti
            </p>
            <Link href="/dashboard/ristoranti" className="mt-4 inline-block font-medium text-emerald-800 hover:underline">
              Gestisci attività
            </Link>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-lg font-semibold text-gray-900">
              Siti web
            </h3>
            <p className="text-gray-600 mt-2">
              Siti attivi sulla piattaforma
            </p>
            <p className="text-3xl font-bold text-emerald-700 mt-4">
              —
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-lg font-semibold text-gray-900">
              Abbonamenti
            </h3>
            <p className="text-gray-600 mt-2">
              Gestione dei piani dei clienti
            </p>
            <p className="text-3xl font-bold text-emerald-700 mt-4">
              —
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
