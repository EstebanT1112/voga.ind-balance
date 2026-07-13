export const colors = {
  background: "#050505",
  foreground: "#ffffff",
  muted: "rgba(255,255,255,0.62)",
  faint: "rgba(255,255,255,0.44)",
  violet: "#9b5de5",
  lilac: "#c084fc",
  rose: "#f472b6",
  coral: "#fb923c",
  mint: "#34d399",
  red: "#e05271",
  white: "#ffffff",
};

export const gradients = {
  app: ["#050505", "#090909", "#050505"],
  primary: ["#9b5de5", "#c084fc", "#f472b6"],
};

export const employeeColors = ["#9b5de5", "#f472b6", "#fb923c", "#34d399", "#c084fc", "#e05271"];

export const ownerColors = employeeColors;

export const shadows = {
  glass: {
    shadowColor: "#000000",
    shadowOpacity: 0.28,
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
