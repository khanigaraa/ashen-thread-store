/**
 * Demo admin login. This is NOT real security: the credentials are shown on
 * the login page so the client can try the dashboard. A real backend with
 * proper authentication replaces this in the live version.
 */
export const DEMO_ADMIN = {
  email: 'admin@ashenthread.test',
  password: 'demo-ashen',
} as const;

export function checkDemoLogin(email: string, password: string): boolean {
  return email.trim().toLowerCase() === DEMO_ADMIN.email && password === DEMO_ADMIN.password;
}
