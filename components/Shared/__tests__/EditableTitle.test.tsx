import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import React from "react";
import { TextInput } from "react-native";
import EditableTitle from "../EditableTitle";

describe("EditableTitle", () => {
  const mockOnChangeText = jest.fn();
  const mockOnBeginEditing = jest.fn();
  const mockOnEndEditing = jest.fn();
  const mockOnSubmitEditing = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with provided value", () => {
    const { getByText, UNSAFE_queryByType } = render(
      <EditableTitle value="My Recipe Title" onChangeText={mockOnChangeText} />
    );

    expect(getByText("My Recipe Title")).toBeTruthy();
    expect(UNSAFE_queryByType(TextInput)).toBeNull();
  });

  it("uses placeholder when value is empty", () => {
    const { getByText } = render(
      <EditableTitle value="" placeholder="Enter Title" onChangeText={mockOnChangeText} />
    );

    expect(getByText("Enter Title")).toBeTruthy();
  });

  it("switches to TextInput and triggers onBeginEditing when pressed", () => {
    const { getByText, UNSAFE_getByType, UNSAFE_queryByType } = render(
      <EditableTitle
        value="Press Me"
        onChangeText={mockOnChangeText}
        onBeginEditing={mockOnBeginEditing}
      />
    );

    // Initial state: Text is rendered
    expect(getByText("Press Me")).toBeTruthy();

    // Press the text
    fireEvent.press(getByText("Press Me"));

    // State changed: TextInput is rendered
    // Multiline TextInput uses RCTMultilineTextInputView which does not support
    // getByDisplayValue or getByPlaceholderText, so use UNSAFE_getByType
    const input = UNSAFE_getByType(TextInput);
    expect(input).toBeTruthy();
    expect(input.props.value).toBe("Press Me");

    // onBeginEditing should have been called
    expect(mockOnBeginEditing).toHaveBeenCalledTimes(1);
  });

  it("does not switch to edit mode when editable is false", () => {
    const { getByText, UNSAFE_queryByType } = render(
      <EditableTitle
        value="Uneditable"
        onChangeText={mockOnChangeText}
        editable={false}
        onBeginEditing={mockOnBeginEditing}
      />
    );

    // Press the text
    fireEvent.press(getByText("Uneditable"));

    // State unchanged: TextInput is NOT rendered
    expect(UNSAFE_queryByType(TextInput)).toBeNull();

    // onBeginEditing should NOT have been called
    expect(mockOnBeginEditing).not.toHaveBeenCalled();
  });

  it("triggers onChangeText when typing in the TextInput", () => {
    const { getByText, UNSAFE_getByType } = render(
      <EditableTitle value="Initial" onChangeText={mockOnChangeText} />
    );

    // Press to edit
    fireEvent.press(getByText("Initial"));

    // Type in the input
    fireEvent.changeText(UNSAFE_getByType(TextInput), "New Title");

    // onChangeText should have been called
    expect(mockOnChangeText).toHaveBeenCalledWith("New Title");
  });

  it("returns to static text mode and triggers onSubmitEditing and onEndEditing when submitting", () => {
    const { getByText, UNSAFE_getByType, UNSAFE_queryByType } = render(
      <EditableTitle
        value="Title"
        onChangeText={mockOnChangeText}
        onSubmitEditing={mockOnSubmitEditing}
        onEndEditing={mockOnEndEditing}
      />
    );

    // Press to edit
    fireEvent.press(getByText("Title"));

    // Submit the input
    fireEvent(UNSAFE_getByType(TextInput), "submitEditing");

    // Both submit and end editing handlers should be called
    expect(mockOnSubmitEditing).toHaveBeenCalledTimes(1);
    expect(mockOnEndEditing).toHaveBeenCalledTimes(1);

    // TextInput should no longer be visible
    expect(UNSAFE_queryByType(TextInput)).toBeNull();
  });

  it("returns to static text mode and triggers onEndEditing when blurring", () => {
    const { getByText, UNSAFE_getByType, UNSAFE_queryByType } = render(
      <EditableTitle
        value="Title"
        onChangeText={mockOnChangeText}
        onEndEditing={mockOnEndEditing}
        onSubmitEditing={mockOnSubmitEditing}
      />
    );

    // Press to edit
    fireEvent.press(getByText("Title"));

    // Blur the input
    fireEvent(UNSAFE_getByType(TextInput), "blur");

    // Only end editing handler should be called, not submit
    expect(mockOnEndEditing).toHaveBeenCalledTimes(1);
    expect(mockOnSubmitEditing).not.toHaveBeenCalled();

    // TextInput should no longer be visible
    expect(UNSAFE_queryByType(TextInput)).toBeNull();
  });
});
