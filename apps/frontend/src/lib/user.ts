export function getUserId(): string {
  const token = localStorage.getItem('auth_token');
  if (!token) throw new Error('User not authenticated');
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub as string;
  } catch {
    throw new Error('Invalid token');
  }
}
