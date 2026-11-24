const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export function formatCents(amount: number) {
  return euro.format(amount / 100);
}

export function estimatedMonthlyTotal(amounts: (number | null)[]) {
  let total = 0;
  for (const amount of amounts) {
    if (amount === null) return "In attesa del listino";
    total += amount;
  }
  return formatCents(total);
}
