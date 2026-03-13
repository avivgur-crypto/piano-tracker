export function getStudentToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("student_token");
}

export function saveStudentAuth(token: string) {
  localStorage.setItem("student_token", token);
}

/**
 * Returns the logged-in student's user id. Must match backend JWT (user_id).
 * Used for GET /ai/pieces/student/{id}, homework, notes — same id the teacher uses when assigning.
 */
export function getStudentId(): number | null {
  const token = getStudentToken();
  if (!token) return null;
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(decodeURIComponent(
      atob(base64).split("").map(c =>
        "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
      ).join("")
    ));
    const id = payload.user_id ?? payload.sub ?? payload.id;
    return id != null ? parseInt(String(id), 10) : null;
  } catch (e) {
    console.error("[auth] JWT parse error:", e);
    return null;
  }
}
