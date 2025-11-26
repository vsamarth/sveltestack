import { Resend } from "resend";
import { env } from "./env";
import { render } from "@react-email/components";
import VerifyEmail from "$lib/emails/verify-email";
import ResetPassword from "$lib/emails/reset-password";
import * as React from "react";

const resend = env.EMAIL_API_KEY ? new Resend(env.EMAIL_API_KEY) : null;

export function isEmailConfigured(): boolean {
  return !!(env.EMAIL_API_KEY && env.EMAIL_FROM);
}

export function checkEmailConfiguration(): void {
  if (env.NODE_ENV === "production" && !isEmailConfigured()) {
    console.warn(
      "⚠️  Email functionality is disabled. EMAIL_API_KEY and EMAIL_FROM environment variables are not set. Email verification and password reset features will not work properly in production.",
    );
  }
}

export async function sendVerificationEmail({
  email,
  url,
  username,
}: {
  email: string;
  url: string;
  username?: string;
}) {
  if (!isEmailConfigured()) {
    console.log("📧 [Email not configured] Verification email would be sent:", {
      to: email,
      subject: "Verify your email address",
      url,
      username,
    });
    return null;
  }

  const html = await render(
    React.createElement(VerifyEmail, { url, username }),
  );

  try {
    const { data, error } = await resend!.emails.send({
      from: env.EMAIL_FROM!,
      to: email,
      subject: "Verify your email address",
      html,
    });

    if (error) {
      console.error("Error sending verification email:", error);
      throw new Error("Failed to send verification email");
    }

    return data;
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
}

export async function sendResetPasswordEmail({
  email,
  url,
  username,
}: {
  email: string;
  url: string;
  username?: string;
}) {
  if (!isEmailConfigured()) {
    console.log(
      "📧 [Email not configured] Reset password email would be sent:",
      {
        to: email,
        subject: "Reset your password",
        url,
        username,
      },
    );
    return null;
  }

  const html = await render(
    React.createElement(ResetPassword, { url, username }),
  );

  try {
    const { data, error } = await resend!.emails.send({
      from: env.EMAIL_FROM!,
      to: email,
      subject: "Reset your password",
      html,
    });

    if (error) {
      console.error("Error sending reset password email:", error);
      throw new Error("Failed to send reset password email");
    }

    return data;
  } catch (error) {
    console.error("Error sending reset password email:", error);
    throw error;
  }
}
