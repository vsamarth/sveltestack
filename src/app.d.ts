// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Session, User } from "better-auth/types";

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      session?: Session | null;
      user?: User | null;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
