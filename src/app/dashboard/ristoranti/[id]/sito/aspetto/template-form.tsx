"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveDraftTemplate } from "./actions";

export default function TemplateForm({ tenantId, previewPath, current, initial, templates }: {
  tenantId: string;
  previewPath: string;
  current: string;
  initial: string;
  templates: string[];
}) {
  const [selected, setSelected] = useState(initial);
  const [result, save, pending] = useActionState(
    async (_previous: { success: boolean; message: string }, data: FormData) => {
      try {
        return await saveDraftTemplate(tenantId, data);
      } catch {
        return { success: false, message: "Impossibile salvare il template. Riprova." };
      }
    },
    { success: true, message: "" },
  );

  return (
    <form action={save} className="space-y-4 rounded-xl border bg-white p-5 sm:p-6">
      <fieldset disabled={pending}>
        <legend className="mb-2 text-lg font-semibold">Template grafico</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {templates.map((template) => (
            <label key={template} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50">
              <input
                type="radio" name="template_key" value={template} checked={selected === template}
                onChange={() => setSelected(template)}
              />
              <span className="capitalize">{template}</span>
              {template === current && <span className="text-sm text-gray-600">In uso</span>}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <Link href={{ pathname: previewPath, query: { template: selected } }} prefetch={false} className="rounded-lg border border-emerald-800 px-4 py-2 font-medium text-emerald-800 hover:bg-emerald-50">
          Prova in anteprima
        </Link>
        <button
          type="submit" disabled={pending || selected === current}
          className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {pending ? "Salvataggio…" : "Salva template"}
        </button>
      </div>
      {result.message && <p role={result.success ? "status" : "alert"} className="text-sm">{result.message}</p>}
    </form>
  );
}
