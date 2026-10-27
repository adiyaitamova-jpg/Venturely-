export type ShellUser = {
  id: string;
  username: string;
  displayName: string;
  avatarHue: number;
  hasAvatar: boolean;
  avatarVersion: number | null;
  role: "USER" | "ADMIN";
  isDemo: boolean;
  onboarded: boolean;
};

export type ShellCounts = { requests: number; notifications: number };
