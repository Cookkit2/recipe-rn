import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import React from "react";
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
    const { getByText, queryByPlaceholderText } = render(
      <EditableTitle value="My Recipe Title" onChangeText={mockOnChangeText} />
    );

    expect(getByText("My Recipe Title")).toBeTruthy();
    expect(queryByPlaceholderText("Title")).toBeNull();
  });

  it("uses placeholder when value is empty", () => {
    const { getByText } = render(
      <EditableTitle value="" placeholder="Enter Title" onChangeText={mockOnChangeText} />
    );

    expect(getByText("Enter Title")).toBeTruthy();
  });

  it("switches to TextInput and triggers onBeginEditing when pressed", () => {
    const { getByText, getByDisplayValue, queryByText } = render(
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
    expect(getByDisplayValue("Press Me")).toBeTruthy();

    // onBeginEditing should have been called
    expect(mockOnBeginEditing).toHaveBeenCalledTimes(1);
  });

  it("does not switch to edit mode when editable is false", () => {
    const { getByText, queryByDisplayValue } = render(
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
    expect(queryByDisplayValue("Uneditable")).toBeNull();

    // onBeginEditing should NOT have been called
    expect(mockOnBeginEditing).not.toHaveBeenCalled();
  });

  it("triggers onChangeText when typing in the TextInput", () => {
    const { getByText, getByDisplayValue } = render(
      <EditableTitle value="Initial" onChangeText={mockOnChangeText} />
    );

    // Press to edit
    fireEvent.press(getByText("Initial"));

    // Type in the input
    fireEvent.changeText(getByDisplayValue("Initial"), "New Title");

    // onChangeText should have been called
    expect(mockOnChangeText).toHaveBeenCalledWith("New Title");
  });

  it("returns to static text mode and triggers onSubmitEditing and onEndEditing when submitting", () => {
    const { getByText, getByDisplayValue, queryByDisplayValue } = render(
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
    fireEvent(getByDisplayValue("Title"), "submitEditing");

    // Both submit and end editing handlers should be called
    expect(mockOnSubmitEditing).toHaveBeenCalledTimes(1);
    expect(mockOnEndEditing).toHaveBeenCalledTimes(1);

    // TextInput should no longer be visible
    expect(queryByDisplayValue("Title")).toBeNull();
  });

  it("returns to static text mode and triggers onEndEditing when blurring", () => {
    const { getByText, getByDisplayValue, queryByDisplayValue } = render(
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
    fireEvent(getByDisplayValue("Title"), "blur");

    // Only end editing handler should be called, not submit
    expect(mockOnEndEditing).toHaveBeenCalledTimes(1);
    expect(mockOnSubmitEditing).not.toHaveBeenCalled();

    // TextInput should no longer be visible
    expect(queryByDisplayValue("Title")).toBeNull();
  });
});
