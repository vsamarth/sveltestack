import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1, "Full Name is required."),
  email: z
    .string()
    .min(1, "Email is required.")
    .check(z.email("Invalid email address.")),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type SignupSchema = typeof signupSchema;

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .check(z.email("Invalid email address.")),
  password: z.string().min(1, "Password is required."),
});

export type LoginSchema = typeof loginSchema;

export const workspaceSchema = z.object({
  name: z
    .string()
    .min(1, "Workspace name is required.")
    .max(50, "Workspace name must be less than 50 characters."),
});

export type WorkspaceSchema = z.infer<typeof workspaceSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .check(z.email("Invalid email address.")),
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

export const inviteSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .check(z.email("Invalid email address.")),
});

export type InviteSchema = z.infer<typeof inviteSchema>;
