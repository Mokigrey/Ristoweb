"use client";

import { useActionState, useState } from "react";
import { saveSiteAppearance } from "./actions";
import { appearanceSections, palettes, type SiteAppearance } from "./appearance";

export default function AppearanceForm({ tenantId, initial }: { tenantId: string; initial: SiteAppearance }) {
  const [appearance, setAppearance] = useState(initial);
  const [result, save, pending] = useActionState(
    async (_previous: { success: boolean; message: string }, data: FormData) => {
      try {
        return await saveSiteAppearance(tenantId, data);
      } catch {
        return { success: false, message: "Impossibile salvare l’aspetto. Riprova." };
      }
    },
    { success: true, message: "" },
  );

  return (
    <form action={save} className="space-y-6">
      <fieldset disabled={pending} className="rounded-xl border bg-white p-5 sm:p-6">
        <legend className="px-2 text-lg font-semibold">Palette colori</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {palettes.map((palette) => (
            <label key={palette.key} className="flex cursor-pointer flex-wrap items-center gap-3 rounded-lg border p-3 has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50">
              <input
                type="radio"
                name="color_palette"
                value={palette.key}
                checked={appearance.color_palette === palette.key}
                onChange={() => setAppearance({ ...appearance, color_palette: palette.key })}
              />
              <span className="grow font-medium">{palette.label}</span>
              {palette.colors && (
                <span aria-hidden="true" className="flex gap-1">
                  {[palette.colors[0], palette.colors[2], palette.colors[4]].map((color) => (
                    <span key={color} className="h-4 w-4 rounded-full border border-black/15" style={{ background: color }} />
                  ))}
                </span>
              )}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={pending} className="rounded-xl border bg-white p-5 sm:p-6">
        <legend className="px-2 text-lg font-semibold">Sezioni della vetrina</legend>
        <p className="mb-4 text-sm text-gray-600">Puoi nascondere una sezione e mostrare di nuovo i suoi contenuti quando vuoi.</p>
        <div className="space-y-3">
          {appearanceSections.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3">
              <input
                type="checkbox"
                name={key}
                checked={appearance[key]}
                onChange={(event) => setAppearance({ ...appearance, [key]: event.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" disabled={pending} className="rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white hover:bg-emerald-800 disabled:opacity-50">
        {pending ? "Salvataggio…" : "Salva aspetto"}
      </button>
      {result.message && (
        <p role={result.success ? "status" : "alert"} className={result.success ? "text-emerald-800" : "text-red-800"}>
          {result.message}
        </p>
      )}
    </form>
  );
}
