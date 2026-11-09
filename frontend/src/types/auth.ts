export type AuthUser = {
  id: string;
  name: string;
  email: string;
  organization: { id: string; name: string };
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
