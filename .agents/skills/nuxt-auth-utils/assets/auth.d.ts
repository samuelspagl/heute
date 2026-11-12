// Target destination: shared/types/auth.d.ts
// Adapt these fields to your application's user record.
declare module '#auth-utils' {
  interface User {
    id: string  // Internal database primary key, not unverified client input
    name?: string
  }

  interface UserSession {
    loggedInAt?: string
  }
}

export {}
