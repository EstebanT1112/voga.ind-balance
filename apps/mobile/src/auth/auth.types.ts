export type ApiRole = "owner" | "seller";

export interface ApiProfile {
  id: string;
  role: ApiRole;
  fullName: string;
  color: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthMeResponse {
  user: {
    id: string;
    email: string | null;
  };
  profile: ApiProfile;
}
