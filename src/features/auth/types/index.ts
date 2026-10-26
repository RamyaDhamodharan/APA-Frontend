export type AuthProfile = {
  email: string;
  role: "admin" | "associate";
  must_change_password: boolean;
  temp_password_expires_at?: string | null;
  name?: string;
};

export type Associate = {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
};

export type AccessClaims = AuthProfile & {
  sub: string;
  scope?: string;
};
