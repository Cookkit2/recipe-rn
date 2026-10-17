import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Button } from "../button";
import { SocialAuthButton } from "~/components/auth/SocialAuthButton";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" },
}));

describe("loading button accessibility", () => {
  it("keeps loading disabled even if a caller passes disabled=false", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <Button
        isLoading
        disabled={false}
        onPress={onPress}
        accessibilityState={{ selected: true, disabled: false }}
      />
    );
    const button = screen.getByRole("button");
    expect(button.props.accessibilityState).toMatchObject({
      selected: true,
      disabled: true,
      busy: true,
    });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("preserves a caller's busy state when the spinner is off", async () => {
    const screen = await render(<Button accessibilityState={{ busy: true }} />);
    expect(screen.getByRole("button").props.accessibilityState.busy).toBe(true);
  });

  it("announces a busy social sign-in button", async () => {
    const screen = await render(<SocialAuthButton provider="apple" onPress={jest.fn()} loading />);
    expect(screen.getByRole("button").props.accessibilityState).toMatchObject({
      disabled: true,
      busy: true,
    });
  });
});
