import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import AuthForm from "./auth-form.svelte";
import { z } from "zod";
import type { SuperValidated } from "sveltekit-superforms";

// Test schema
const testSchema = z.object({
  email: z.string().email("Invalid email").min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Reusable field configs
const fields = {
  email: { label: "Email", type: "email" },
  password: { label: "Password", type: "password" },
} as const;

// Base props
const baseProps = {
  schema: testSchema,
  onSubmit: vi.fn().mockResolvedValue(undefined),
  title: "Test Form",
  submitText: "Submit",
};

// Common prop combinations
const withFields = (fieldConfig: typeof fields | Partial<typeof fields>) => ({
  ...baseProps,
  fields: fieldConfig,
});

const withMockSubmit = () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
  return { mockOnSubmit, props: { ...baseProps, onSubmit: mockOnSubmit } };
};

describe("AuthForm", () => {
  describe("rendering", () => {
    it("renders title and submit button", async () => {
      const { getByRole } = render(AuthForm, baseProps);

      await expect
        .element(getByRole("heading", { level: 1 }))
        .toHaveTextContent("Test Form");
      await expect
        .element(getByRole("button", { name: /submit/i }))
        .toBeInTheDocument();
    });

    it("renders description when provided", async () => {
      const { getByText } = render(AuthForm, {
        ...baseProps,
        description: "Test description",
      });

      await expect.element(getByText("Test description")).toBeInTheDocument();
    });

    it("renders configured fields", async () => {
      const { getByLabelText } = render(AuthForm, withFields(fields));

      await expect.element(getByLabelText("Email")).toBeInTheDocument();
      await expect.element(getByLabelText("Password")).toBeInTheDocument();
    });

    it("renders without fields when none configured", async () => {
      const { getByRole } = render(AuthForm, withFields({}));

      await expect
        .element(getByRole("heading", { level: 1 }))
        .toBeInTheDocument();
      await expect
        .element(getByRole("button", { name: /submit/i }))
        .toBeInTheDocument();
    });
  });

  describe("footer link", () => {
    it("renders when all link props provided", async () => {
      const { getByRole, getByText } = render(AuthForm, {
        ...baseProps,
        linkText: "Need help?",
        linkHref: "/help",
        linkLabel: "Get help",
      });

      await expect.element(getByText("Need help?")).toBeInTheDocument();
      await expect
        .element(getByRole("link", { name: /get help/i }))
        .toHaveAttribute("href", "/help");
    });

    it("does not render when link props missing", async () => {
      const { container } = render(AuthForm, baseProps);
      expect(container.querySelector("a")).toBeNull();
    });
  });

  describe("password field", () => {
    const passwordProps = withFields({ password: fields.password });

    it("toggles visibility when button clicked", async () => {
      const { getByLabelText, getByRole } = render(AuthForm, passwordProps);

      const input = getByLabelText("Password");
      await input.fill("secret123");

      await expect.element(input).toHaveAttribute("type", "password");
      await getByRole("button", { name: /show password/i }).click();
      await expect.element(input).toHaveAttribute("type", "text");
      await getByRole("button", { name: /hide password/i }).click();
      await expect.element(input).toHaveAttribute("type", "password");
    });

    it("hides toggle button when empty", async () => {
      const { container } = render(AuthForm, passwordProps);
      expect(container.querySelector('button[type="button"]')).toBeNull();
    });

    it("shows forgot password link when configured", async () => {
      const { getByRole } = render(AuthForm, {
        ...baseProps,
        fields: { password: { ...fields.password, showForgotPassword: true } },
      });

      await expect
        .element(getByRole("link", { name: /forgot password/i }))
        .toHaveAttribute("href", "/forgot-password");
    });

    it("hides toggle when password is cleared", async () => {
      const { getByLabelText, getByRole, container } = render(
        AuthForm,
        passwordProps,
      );

      const input = getByLabelText("Password");
      await input.fill("secret123");

      // Toggle should be visible
      await expect
        .element(getByRole("button", { name: /show password/i }))
        .toBeInTheDocument();

      // Clear the password
      await input.fill("");

      // Toggle should disappear
      expect(container.querySelector('button[type="button"]')).toBeNull();
    });
  });

  describe("autocomplete", () => {
    it("sets default autocomplete for email and password", async () => {
      const { getByLabelText } = render(AuthForm, withFields(fields));

      await expect
        .element(getByLabelText("Email"))
        .toHaveAttribute("autocomplete", "email");
      await expect
        .element(getByLabelText("Password"))
        .toHaveAttribute("autocomplete", "current-password");
    });

    it("allows overriding autocomplete", async () => {
      const { getByLabelText } = render(AuthForm, {
        ...baseProps,
        fields: {
          password: { ...fields.password, autocomplete: "new-password" },
        },
      });

      await expect
        .element(getByLabelText("Password"))
        .toHaveAttribute("autocomplete", "new-password");
    });
  });

  describe("validation", () => {
    it("displays validation errors and blocks submission", async () => {
      const { mockOnSubmit, props } = withMockSubmit();
      const { getByLabelText, getByRole, getByText } = render(AuthForm, {
        ...props,
        fields: { email: fields.email },
      });

      await getByLabelText("Email").fill("invalid");
      await getByRole("button", { name: /submit/i }).click();

      await vi.waitFor(
        () => expect(getByText(/invalid email/i).element()).toBeTruthy(),
        { timeout: 2000 },
      );
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("shows errors for multiple invalid fields", async () => {
      const { mockOnSubmit, props } = withMockSubmit();
      const { getByLabelText, getByRole, getByText } = render(AuthForm, {
        ...props,
        fields,
      });

      await getByLabelText("Email").fill("bad");
      await getByLabelText("Password").fill("short");
      await getByRole("button", { name: /submit/i }).click();

      await vi.waitFor(
        () => {
          expect(getByText(/invalid email/i).element()).toBeTruthy();
          expect(getByText(/at least 8 characters/i).element()).toBeTruthy();
        },
        { timeout: 2000 },
      );
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("clears errors and submits after fixing invalid input", async () => {
      const { mockOnSubmit, props } = withMockSubmit();
      const { getByLabelText, getByRole, getByText, container } = render(
        AuthForm,
        {
          ...props,
          fields,
        },
      );

      // Submit with invalid data
      await getByLabelText("Email").fill("invalid");
      await getByLabelText("Password").fill("short");
      await getByRole("button", { name: /submit/i }).click();

      await vi.waitFor(
        () => expect(getByText(/invalid email/i).element()).toBeTruthy(),
        { timeout: 2000 },
      );

      // Fix the errors
      await getByLabelText("Email").fill("valid@example.com");
      await getByLabelText("Password").fill("validpassword123");
      await getByRole("button", { name: /submit/i }).click();

      // Should submit successfully
      await vi.waitFor(() => expect(mockOnSubmit).toHaveBeenCalled(), {
        timeout: 2000,
      });

      // Errors should be cleared
      expect(container.querySelector("[data-fs-field-error]")).toBeNull();
    });
  });

  describe("submission", () => {
    it("calls onSubmit with valid data", async () => {
      const { mockOnSubmit, props } = withMockSubmit();
      const { getByLabelText, getByRole } = render(AuthForm, {
        ...props,
        fields,
      });

      await getByLabelText("Email").fill("test@example.com");
      await getByLabelText("Password").fill("password123");
      await getByRole("button", { name: /submit/i }).click();

      await vi.waitFor(() => expect(mockOnSubmit).toHaveBeenCalled(), {
        timeout: 2000,
      });

      const callArgs = mockOnSubmit.mock.calls[0][0] as SuperValidated<
        z.infer<typeof testSchema>
      >;
      expect(callArgs.data.email).toBe("test@example.com");
      expect(callArgs.data.password).toBe("password123");
      expect(callArgs.valid).toBe(true);
    });

    it("shows spinner and disables button during submission", async () => {
      let resolveSubmit: () => void;
      const mockOnSubmit = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          }),
      );

      const { getByLabelText, getByRole } = render(AuthForm, {
        ...baseProps,
        onSubmit: mockOnSubmit,
        fields,
      });

      await getByLabelText("Email").fill("test@example.com");
      await getByLabelText("Password").fill("password123");

      const submitButton = getByRole("button", { name: /submit/i });
      await submitButton.click();

      // Button should be disabled and show spinner
      await expect.element(submitButton).toBeDisabled();
      await expect
        .element(getByRole("status", { name: /loading/i }))
        .toBeInTheDocument();

      resolveSubmit!();
    });

    it("prevents double submission", async () => {
      let resolveSubmit: () => void;
      const mockOnSubmit = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          }),
      );

      const { getByLabelText, getByRole } = render(AuthForm, {
        ...baseProps,
        onSubmit: mockOnSubmit,
        fields,
      });

      await getByLabelText("Email").fill("test@example.com");
      await getByLabelText("Password").fill("password123");

      const submitButton = getByRole("button", { name: /submit/i });

      // Click multiple times rapidly
      await submitButton.click();
      await submitButton.click();
      await submitButton.click();

      // Wait for delayed state
      await expect.element(submitButton).toBeDisabled();

      // Should only have been called once
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);

      resolveSubmit!();
    });
  });
});