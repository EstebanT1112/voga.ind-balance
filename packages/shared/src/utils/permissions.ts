import type { UserRole } from "../constants/roles";

export function isOwner(role: UserRole): boolean {
  return role === "owner";
}

export function isSeller(role: UserRole): boolean {
  return role === "seller";
}

export function canSellerAccessSale(sellerId: string, saleSellerId: string): boolean {
  return sellerId === saleSellerId;
}
