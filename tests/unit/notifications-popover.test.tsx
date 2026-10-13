import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { NotificationsPopover } from "@/components/layout/notifications-popover";

// Mock the dynamic import of actions
vi.mock("@/app/(erp)/notifications/actions", () => ({
  fetchNotificationsAction: vi.fn().mockResolvedValue({
    success: true,
    data: [],
  }),
  markNotificationReadAction: vi.fn().mockResolvedValue({ success: true }),
  markAllNotificationsReadAction: vi.fn().mockResolvedValue({ success: true }),
}));

describe("NotificationsPopover component", () => {
  it("renders the notification trigger button", () => {
    render(<NotificationsPopover />);
    const trigger = screen.getByRole("button", { name: /view notifications/i });
    expect(trigger).toBeInTheDocument();
  });

  it("toggles the popover when clicked and shows clean empty state", async () => {
    render(<NotificationsPopover />);
    const trigger = screen.getByRole("button", { name: /view notifications/i });
    
    // Initially popover content is closed
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(trigger);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
    expect(screen.getByText(/all systems and alerts are up to date/i)).toBeInTheDocument();

    // Click trigger again to close
    fireEvent.click(trigger);
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
  });
});
