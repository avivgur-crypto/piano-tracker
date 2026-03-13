export type User = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
};

const TOKEN_KEY = "piano_tracker_token";
const USER_KEY = "piano_tracker_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
  );
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;

  const raw =
    localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return Boolean(getToken());
}

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // Also clear cookie used for middleware
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  window.location.href = "/login";
}

export function isTeacher(): boolean {
  const user = getUser();
  return user?.role === "teacher";
}

export function isStudent(): boolean {
  const user = getUser();
  return user?.role === "student";
}

export function saveAuth(token: string, user: User, remember = true) {
  if (typeof window === "undefined") return;

  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));

  // Keep a cookie for middleware access (optional)
  document.cookie = `${TOKEN_KEY}=${token}; path=/`;
}
