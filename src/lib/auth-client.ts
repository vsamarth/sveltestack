import { createAuthClient } from "better-auth/svelte";

export const authClient = createAuthClient({});

type ErrorTypes = Partial<Record<keyof typeof authClient.$ERROR_CODES, string>>;

const errorTypes: ErrorTypes = {
  INVALID_EMAIL_OR_PASSWORD: "Incorrect email or password.",
  INVALID_TOKEN: "This reset link is invalid or has expired. Please request a new one.",
};

export const getErrorMessage = (errorCode?: string) => {
  return (
    errorTypes[errorCode as keyof ErrorTypes] ||
    "Something went wrong. Please try again."
  );
};
