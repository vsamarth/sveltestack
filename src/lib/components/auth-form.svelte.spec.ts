import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import AuthForm from "./auth-form.svelte";
import { loginSchema, signupSchema } from "$lib/validation";
import type { SuperValidated } from "sveltekit-superforms";

describe("Authentication Form", () => {
  describe("Basic Rendering", () => {
    it("should render title heading", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByRole } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
      });

      const heading = getByRole("heading", { level: 1 });
      await expect.element(heading).toBeInTheDocument();
      await expect.element(heading).toHaveTextContent("Sign In");
    });

    it("should render description when provided", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByText } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
        description: "Enter your credentials to continue",
      });

      const description = getByText("Enter your credentials to continue");
      await expect.element(description).toBeInTheDocument();
    });

    it("should render submit button with correct text", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByRole } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
      });

      const submitButton = getByRole("button", { name: /sign in/i });
      await expect.element(submitButton).toBeInTheDocument();
    });
  });

  describe("Field Rendering", () => {
    it("should render standard fields with labels", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByLabelText } = render(AuthForm, {
        schema: signupSchema,
        onSubmit: mockOnSubmit,
        title: "Sign Up",
        submitText: "Create Account",
        fields: {
          name: {
            label: "Full Name",
            type: "text",
            autocomplete: "name",
          },
          email: {
            label: "Email",
            type: "email",
            autocomplete: "email",
          },
        },
      });

      const nameLabel = getByLabelText("Full Name");
      const emailLabel = getByLabelText("Email");

      await expect.element(nameLabel).toBeInTheDocument();
      await expect.element(emailLabel).toBeInTheDocument();
    });

    it("should render password field with label", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByLabelText } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
        fields: {
          password: {
            label: "Password",
            type: "password",
            autocomplete: "current-password",
          },
        },
      });

      const passwordLabel = getByLabelText("Password");
      await expect.element(passwordLabel).toBeInTheDocument();
      await expect.element(passwordLabel).toHaveAttribute("type", "password");
    });

    it("should render all fields from fieldsConfig", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByLabelText } = render(AuthForm, {
        schema: signupSchema,
        onSubmit: mockOnSubmit,
        title: "Sign Up",
        submitText: "Create Account",
        fields: {
          name: {
            label: "Full Name",
            type: "text",
          },
          email: {
            label: "Email",
            type: "email",
          },
          password: {
            label: "Password",
            type: "password",
          },
        },
      });

      const nameField = getByLabelText("Full Name");
      const emailField = getByLabelText("Email");
      const passwordField = getByLabelText("Password");

      await expect.element(nameField).toBeInTheDocument();
      await expect.element(emailField).toBeInTheDocument();
      await expect.element(passwordField).toBeInTheDocument();
    });
  });

  describe("Password Field Functionality", () => {
    it("should show password toggle button when password field has value", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByLabelText, getByRole } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
        fields: {
          password: {
            label: "Password",
            type: "password",
          },
        },
      });

      const passwordInput = getByLabelText("Password");
      await passwordInput.fill("testpassword123");

      // Wait for the toggle button to appear
      const toggleButton = getByRole("button", { name: /show password/i });
      await expect.element(toggleButton).toBeInTheDocument();
    });

    it("should toggle password visibility when button is clicked", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByLabelText, getByRole } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
        fields: {
          password: {
            label: "Password",
            type: "password",
          },
        },
      });

      const passwordInput = getByLabelText("Password");
      await passwordInput.fill("testpassword123");

      // Wait for toggle button and click it
      const toggleButton = getByRole("button", { name: /show password/i });
      await expect.element(toggleButton).toBeInTheDocument();
      await toggleButton.click();

      // Password should now be visible (type="text")
      await expect.element(passwordInput).toHaveAttribute("type", "text");

      // Button should now say "Hide password"
      const hideButton = getByRole("button", { name: /hide password/i });
      await expect.element(hideButton).toBeInTheDocument();
    });

    it("should show 'Forgot password?' link when showForgotPassword is true", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByRole } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
        fields: {
          password: {
            label: "Password",
            type: "password",
            showForgotPassword: true,
          },
        },
      });

      const forgotPasswordLink = getByRole("link", {
        name: /forgot password/i,
      });
      await expect.element(forgotPasswordLink).toBeInTheDocument();
      await expect
        .element(forgotPasswordLink)
        .toHaveAttribute("href", "/forgot-password");
    });

    it("should not show 'Forgot password?' link when showForgotPassword is false", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { container } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
        fields: {
          password: {
            label: "Password",
            type: "password",
            showForgotPassword: false,
          },
        },
      });

      const forgotPasswordLink = container.querySelector(
        'a[href="/forgot-password"]',
      );
      expect(forgotPasswordLink).toBeNull();
    });
  });

  describe("Form Submission", () => {
    it("should call onSubmit with validated form data", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByLabelText, getByRole } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
        fields: {
          email: {
            label: "Email",
            type: "email",
          },
          password: {
            label: "Password",
            type: "password",
          },
        },
      });

      const emailInput = getByLabelText("Email");
      const passwordInput = getByLabelText("Password");
      const submitButton = getByRole("button", { name: /sign in/i });

      await emailInput.fill("test@example.com");
      await passwordInput.fill("password123");
      await submitButton.click();

      // Wait for form submission to complete
      await vi.waitFor(
        () => {
          expect(mockOnSubmit).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );
      const callArgs = mockOnSubmit.mock.calls[0][0] as SuperValidated<{
        email: string;
        password: string;
      }>;
      expect(callArgs.data.email).toBe("test@example.com");
      expect(callArgs.data.password).toBe("password123");
      expect(callArgs.valid).toBe(true);
    });
  });

  describe("Optional Props", () => {
    it("should render footer link when linkText, linkHref, and linkLabel are provided", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByText, getByRole } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
        linkText: "Don't have an account?",
        linkHref: "/register",
        linkLabel: "Sign up",
      });

      const linkText = getByText("Don't have an account?");
      const link = getByRole("link", { name: /sign up/i });

      await expect.element(linkText).toBeInTheDocument();
      await expect.element(link).toBeInTheDocument();
      await expect.element(link).toHaveAttribute("href", "/register");
    });

    it("should not render footer link when props are missing", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { container } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
      });

      const link = container.querySelector('a[href="/register"]');
      expect(link).toBeNull();
    });
  });

  describe("Form Validation", () => {
    it("should display validation errors for invalid input", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByLabelText, getByRole, getByText } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
        fields: {
          email: {
            label: "Email",
            type: "email",
          },
          password: {
            label: "Password",
            type: "password",
          },
        },
      });

      const emailInput = getByLabelText("Email");
      const submitButton = getByRole("button", { name: /sign in/i });

      // Submit with invalid email
      await emailInput.fill("invalid-email");
      await submitButton.click();

      // Wait for validation error to appear
      const errorMessage = await vi.waitFor(
        () => {
          try {
            const error = getByText(/invalid email address/i);
            return error;
          } catch {
            throw new Error("Validation error not found yet");
          }
        },
        { timeout: 2000 },
      );

      await expect.element(errorMessage).toBeInTheDocument();
    });

    it("should NOT call onSubmit when validation fails", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByLabelText, getByRole } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
        fields: {
          email: {
            label: "Email",
            type: "email",
          },
          password: {
            label: "Password",
            type: "password",
          },
        },
      });

      const emailInput = getByLabelText("Email");
      const submitButton = getByRole("button", { name: /sign in/i });

      // Submit with invalid email format
      await emailInput.fill("invalid-email");
      await submitButton.click();

      // Wait a bit to ensure any async operations complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // onSubmit should NOT have been called
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should show required field errors on empty submission", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByRole, getByText } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
        fields: {
          email: {
            label: "Email",
            type: "email",
          },
          password: {
            label: "Password",
            type: "password",
          },
        },
      });

      const submitButton = getByRole("button", { name: /sign in/i });

      // Submit without filling any fields
      await submitButton.click();

      // Wait for validation errors to appear
      await vi.waitFor(
        () => {
          const emailError = getByText(/email is required/i);
          return emailError;
        },
        { timeout: 2000 },
      );

      const emailError = getByText(/email is required/i);
      await expect.element(emailError).toBeInTheDocument();

      // onSubmit should NOT have been called
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should show password minimum length error for signup", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByLabelText, getByRole, getByText } = render(AuthForm, {
        schema: signupSchema,
        onSubmit: mockOnSubmit,
        title: "Sign Up",
        submitText: "Create Account",
        fields: {
          name: {
            label: "Full Name",
            type: "text",
          },
          email: {
            label: "Email",
            type: "email",
          },
          password: {
            label: "Password",
            type: "password",
          },
        },
      });

      const nameInput = getByLabelText("Full Name");
      const emailInput = getByLabelText("Email");
      const passwordInput = getByLabelText("Password");
      const submitButton = getByRole("button", { name: /create account/i });

      // Fill valid name and email, but password too short
      await nameInput.fill("John Doe");
      await emailInput.fill("john@example.com");
      await passwordInput.fill("short");
      await submitButton.click();

      // Wait for password validation error
      const errorMessage = await vi.waitFor(
        () => {
          const error = getByText(/password must be at least 8 characters/i);
          return error;
        },
        { timeout: 2000 },
      );

      await expect.element(errorMessage).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should disable submit button during form submission", async ({
      skip,
    }) => {
      skip();
      const mockOnSubmit = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 1000)),
        );

      const { getByLabelText, getByRole } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
        fields: {
          email: {
            label: "Email",
            type: "email",
          },
          password: {
            label: "Password",
            type: "password",
          },
        },
      });

      const emailInput = getByLabelText("Email");
      const passwordInput = getByLabelText("Password");
      const submitButton = getByRole("button", { name: /sign in/i });

      await emailInput.fill("test@example.com");
      await passwordInput.fill("password123");
      await submitButton.click();

      // Wait for button to be disabled (delayMs is 500)
      // expect.element already handles waiting, so we can use it directly
      await expect.element(submitButton).toBeDisabled();
    });
  });

  describe("Autocomplete Attributes", () => {
    it("should set email autocomplete by default for email fields", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByLabelText } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
        fields: {
          email: {
            label: "Email",
            type: "email",
          },
        },
      });

      const emailInput = getByLabelText("Email");
      await expect.element(emailInput).toHaveAttribute("autocomplete", "email");
    });

    it("should set current-password autocomplete by default for password fields", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByLabelText } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
        fields: {
          password: {
            label: "Password",
            type: "password",
          },
        },
      });

      const passwordInput = getByLabelText("Password");
      await expect
        .element(passwordInput)
        .toHaveAttribute("autocomplete", "current-password");
    });

    it("should allow overriding autocomplete attributes", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByLabelText } = render(AuthForm, {
        schema: signupSchema,
        onSubmit: mockOnSubmit,
        title: "Sign Up",
        submitText: "Create Account",
        fields: {
          password: {
            label: "Password",
            type: "password",
            autocomplete: "new-password",
          },
        },
      });

      const passwordInput = getByLabelText("Password");
      await expect
        .element(passwordInput)
        .toHaveAttribute("autocomplete", "new-password");
    });
  });

  describe("Password Toggle Edge Cases", () => {
    it("should NOT show password toggle button when password field is empty", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { container } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
        fields: {
          password: {
            label: "Password",
            type: "password",
          },
        },
      });

      // Toggle button should not be present when password is empty
      const toggleButton = container.querySelector('button[type="button"]');
      expect(toggleButton).toBeNull();
    });

    it("should toggle password back to hidden after showing", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      const { getByLabelText, getByRole } = render(AuthForm, {
        schema: loginSchema,
        onSubmit: mockOnSubmit,
        title: "Sign In",
        submitText: "Sign in",
        fields: {
          password: {
            label: "Password",
            type: "password",
          },
        },
      });

      const passwordInput = getByLabelText("Password");
      await passwordInput.fill("testpassword123");

      // Show password
      const showButton = getByRole("button", { name: /show password/i });
      await showButton.click();
      await expect.element(passwordInput).toHaveAttribute("type", "text");

      // Hide password again
      const hideButton = getByRole("button", { name: /hide password/i });
      await hideButton.click();
      await expect.element(passwordInput).toHaveAttribute("type", "password");
    });
  });
});
