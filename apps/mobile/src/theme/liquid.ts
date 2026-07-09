export const colors = {
  background: "#f8f4f7",
  foreground: "#1a1523",
  muted: "rgba(90,60,120,0.58)",
  faint: "rgba(90,60,120,0.42)",
  violet: "#9b5de5",
  lilac: "#c084fc",
  rose: "#f472b6",
  coral: "#fb923c",
  mint: "#34d399",
  red: "#e05271",
  white: "#ffffff",
};

export const gradients = {
  app: ["#f3ecfa", "#f9eef7", "#fce9f4"],
  primary: ["#9b5de5", "#c084fc", "#f472b6"],
};

export const shadows = {
  glass: {
    shadowColor: colors.violet,
    shadowOpacity: 0.13,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    elevation: 8,
  },
};

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    currency: "ARS",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}
