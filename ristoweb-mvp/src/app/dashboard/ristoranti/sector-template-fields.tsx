"use client";

import { useState } from "react";
import { sectorLabel, type CatalogEntry } from "./site-catalog";

export default function SectorTemplateFields({
  catalog,
  initialSector = "",
  initialTemplate = "",
  disabled = false,
}: {
  catalog: CatalogEntry[];
  initialSector?: string;
  initialTemplate?: string;
  disabled?: boolean;
}) {
  const [sector, setSector] = useState(initialSector);
  const [template, setTemplate] = useState(initialTemplate);
  const sectors = [...new Set(catalog.map((entry) => entry.sector_key))]
    .sort((a, b) => sectorLabel(a).localeCompare(sectorLabel(b), "it"));
  const templates = catalog
    .filter((entry) => entry.sector_key === sector)
    .map((entry) => entry.template_key);
  const selectedTemplate = templates.includes(template) ? template : "";

  return (
    <>
      <div>
        <label htmlFor="businessType" className="mb-2 block font-medium text-gray-800">
          Settore di attività
        </label>
        <select
          id="businessType"
          name="business_type"
          required
          value={sector}
          disabled={disabled}
          onChange={(event) => {
            const nextSector = event.target.value;
            setSector(nextSector);
            if (!catalog.some((entry) => entry.sector_key === nextSector && entry.template_key === template)) {
              setTemplate("");
            }
          }}
          className="w-full rounded-lg border p-3 text-gray-900"
        >
          <option value="" disabled>Scegli un settore</option>
          {sectors.map((key) => <option key={key} value={key}>{sectorLabel(key)}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="templateKey" className="mb-2 block font-medium text-gray-800">
          Template grafico
        </label>
        <select
          id="templateKey"
          name="template_key"
          required
          disabled={disabled || !sector}
          value={selectedTemplate}
          onChange={(event) => setTemplate(event.target.value)}
          className="w-full rounded-lg border p-3 text-gray-900 disabled:opacity-60"
        >
          <option value="" disabled>{sector ? "Scegli un template" : "Prima scegli il settore"}</option>
          {templates.map((key) => (
            <option key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</option>
          ))}
        </select>
      </div>
    </>
  );
}
