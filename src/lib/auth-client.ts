import { createAuthClient } from "better-auth/svelte";

export const authClient = createAuthClient({});

type ErrorTypes = Partial<Record<keyof typeof authClient.$ERROR_CODES, string>>;

const errorTypes: ErrorTypes = {
  INVALID_EMAIL_OR_PASSWORD: "Email or password is incorrect.",
  INVALID_TOKEN: "This link is invalid or has expired. Request a new one.",
  USER_ALREADY_EXISTS: "An account with this email already exists.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "This email is already taken. Try another one.",
};
export const getErrorMessage = (errorCode?: string) => {
  return (
    errorTypes[errorCode as keyof ErrorTypes] ||
    "Something went wrong. Please try again."
  );
};
