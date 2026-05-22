import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import HelpfulButton from "../HelpfulButton";

// Mock lucide-uniwind
jest.mock("lucide-uniwind", () => ({
  ThumbsUpIcon: () => null,
}));

describe("HelpfulButton", () => {
  it("renders count text when count > 0", () => {
    const { getByText } = render(<HelpfulButton count={5} isVoted={false} onPress={jest.fn()} />);
    expect(getByText("5")).toBeDefined();
  });

  it("calls onPress when pressed", () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <HelpfulButton count={0} isVoted={false} onPress={onPress} />
    );
    fireEvent.press(getByLabelText("Mark as helpful"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
