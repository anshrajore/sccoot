export * from "./tokens";

export function formatInrPaise(paise: number | bigint): string {
  const n = Number(paise) / 100;
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
