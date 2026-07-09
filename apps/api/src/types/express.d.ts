import type { User } from "@supabase/supabase-js";
import type { ApiProfile } from "../modules/users/user.types.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        token: string;
        user: User;
        profile: ApiProfile;
      };
    }
  }
}
