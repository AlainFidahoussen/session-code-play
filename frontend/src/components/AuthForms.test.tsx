import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthForms } from "./AuthForms";
import { authApi } from "@/services";

vi.mock("@/services", () => ({
  authApi: {
    login: vi.fn(),
    signup: vi.fn(),
  },
}));

describe("AuthForms", () => {
  beforeEach(() => {
    vi.mocked(authApi.login).mockReset();
    vi.mocked(authApi.signup).mockReset();
  });

  it("disables submit until both fields are filled", async () => {
    const user = userEvent.setup();
    render(<AuthForms onAuthenticated={vi.fn()} />);

    const submit = screen.getByRole("button", { name: "Log in" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Username"), "alice");
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Password"), "hunter2");
    expect(submit).toBeEnabled();
  });

  it("logs in and reports the authenticated user", async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    vi.mocked(authApi.login).mockResolvedValue({ username: "alice" });
    render(<AuthForms onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(authApi.login).toHaveBeenCalledWith("alice", "hunter2");
    expect(onAuthenticated).toHaveBeenCalledWith({ username: "alice" });
  });

  it("shows an error and does not call onAuthenticated when login fails", async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    vi.mocked(authApi.login).mockRejectedValue(new Error("nope"));
    render(<AuthForms onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Invalid username or password.")).toBeInTheDocument();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it("switches to signup mode and calls authApi.signup on submit", async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    vi.mocked(authApi.signup).mockResolvedValue({ username: "bob" });
    render(<AuthForms onAuthenticated={onAuthenticated} />);

    await user.click(screen.getByRole("button", { name: "Need an account? Sign up" }));
    expect(screen.getByRole("heading", { name: "Create an account" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Username"), "bob");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(authApi.signup).toHaveBeenCalledWith("bob", "password123");
    expect(onAuthenticated).toHaveBeenCalledWith({ username: "bob" });
  });
});
