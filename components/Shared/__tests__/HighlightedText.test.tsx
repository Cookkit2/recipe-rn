import React from "react";
import { render } from "@testing-library/react-native";
import HighlightedText from "../HighlightedText";

describe("HighlightedText", () => {
  it("renders text without bold formatting", async () => {
    const { getByText } = await render(<HighlightedText text="Normal text" />);
    expect(getByText("Normal text")).toBeTruthy();
  });

  it("renders text with bold formatting", async () => {
    const { getByText } = await render(<HighlightedText text="**Bold** text" />);
    const boldText = getByText("Bold");
    expect(boldText).toBeTruthy();
    expect(boldText.props.className).toContain("font-urbanist-semibold text-foreground");
  });

  it("renders complex text with multiple bold sections", async () => {
    const { getByText } = await render(
      <HighlightedText text="**Bold** text **more bold** and **even more**" />
    );
    expect(getByText("Bold")).toBeTruthy();
    expect(getByText("more bold")).toBeTruthy();
    expect(getByText("even more")).toBeTruthy();
  });
});
