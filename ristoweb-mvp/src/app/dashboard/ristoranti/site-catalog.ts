export type CatalogEntry = {
  sector_key: string;
  template_key: string;
};

const sectorLabels: Record<string, string> = {
  restaurant: "Ristorante",
  pizzeria: "Pizzeria",
  restaurant_pizzeria: "Ristorante e pizzeria",
  beauty: "Beauty e benessere",
  retail: "Negozio",
  professional: "Studio professionale",
};

export function sectorLabel(key: string) {
  return Object.hasOwn(sectorLabels, key) ? sectorLabels[key] : key;
}
