import { act, render, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";
import Coordinator from "../LeftoverReminderCoordinator";
import { useLeftovers } from "~/hooks/queries/useLeftovers";
import { syncLeftoverReminder } from "../leftover-reminders";

let mockStart: () => void;
const mockCancel = jest.fn();
const mockRefetch = jest.fn();
jest.mock("react-native/Libraries/AppState/AppState", () => ({
  __esModule: true,
  default: { currentState: "active", addEventListener: jest.fn() },
}));
jest.mock("~/lib/schedule-after-render", () => ({
  scheduleAfterInitialRender: (task: () => void) => {
    mockStart = task;
    return mockCancel;
  },
}));
jest.mock("~/hooks/queries/useLeftovers", () => ({ useLeftovers: jest.fn() }));
jest.mock("../leftover-reminders", () => ({ syncLeftoverReminder: jest.fn() }));
jest.mock("../NotificationProvider", () => ({
  useNotificationContext: () => ({ isInitialized: true }),
}));
const reminder = { id: "test-leftover" };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useLeftovers).mockReturnValue({ data: [reminder], refetch: mockRefetch } as never);
  jest.mocked(syncLeftoverReminder).mockResolvedValue(true);
});

it("starts leftover queries and reconciliation only after deferred startup", async () => {
  let onState: ((state: string) => void) | undefined;
  const remove = jest.fn();
  const listener = jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_event, callback) => {
      onState = callback as typeof onState;
      return { remove };
    });
  try {
    const screen = await render(<Coordinator />);
    expect(useLeftovers).not.toHaveBeenCalled();
    expect(syncLeftoverReminder).not.toHaveBeenCalled();
    await act(async () => mockStart());
    await waitFor(() => expect(syncLeftoverReminder).toHaveBeenCalledWith(reminder));
    await act(async () => onState?.("active"));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
    await screen.unmount();
    expect(mockCancel).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
  } finally {
    listener.mockRestore();
  }
});

it("cancels deferred startup if the coordinator unmounts first", async () => {
  const screen = await render(<Coordinator />);
  await screen.unmount();
  expect(mockCancel).toHaveBeenCalledTimes(1);
  expect(useLeftovers).not.toHaveBeenCalled();
});
