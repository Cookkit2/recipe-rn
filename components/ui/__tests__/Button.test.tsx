import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Button } from "../button";

describe("Button", () => {
  it("renders correctly", () => {
    const { getByRole } = render(<Button />);
    expect(getByRole("button")).toBeTruthy();
  });

  it("merges computed disabled and busy states with caller-provided accessibilityState", () => {
    const { getByRole } = render(
      <Button isLoading={true} accessibilityState={{ selected: true, disabled: false }} />
    );
    const button = getByRole("button");

    // Note: React Native's render resolves accessibilityState internally,
    // but the props object contains what was passed to the Pressable.
    const state = button.props.accessibilityState;

    // We expect the explicit disabled and busy values to have overriden caller 'disabled'
    expect(state).toEqual({
      disabled: true,
      busy: true,
      selected: true,
    });
  });
});
