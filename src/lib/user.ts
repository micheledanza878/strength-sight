export function getUserId(): string {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.id;
    } catch {
      localStorage.removeItem("user");
    }
  }
  throw new Error("User not authenticated");
}
