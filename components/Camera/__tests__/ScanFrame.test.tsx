import { describe, it, expect } from "@jest/globals";
import { render } from "@testing-library/react-native";
import React from "react";
import { View } from "react-native";
import ScanFrame from "../ScanFrame";

describe("ScanFrame", () => {
  it("renders correctly with given x and y coordinates", () => {
    const { root } = render(<ScanFrame x={100} y={200} />);
    expect(root).toBeDefined();
  });

  it("calculates offset correctly based on props", () => {
    const { UNSAFE_root } = render(<ScanFrame x={100} y={200} />);
    const container = UNSAFE_root.findAllByType(View)[0]!;
    expect(container.props.style).toEqual({ left: 52, top: 152 });
  });

  it("handles negative coordinates", () => {
    const { UNSAFE_root } = render(<ScanFrame x={-10} y={-20} />);
    const container = UNSAFE_root.findAllByType(View)[0]!;
    expect(container.props.style).toEqual({ left: -58, top: -68 });
  });

  it("handles zero coordinates", () => {
    const { UNSAFE_root } = render(<ScanFrame x={0} y={0} />);
    const container = UNSAFE_root.findAllByType(View)[0]!;
    expect(container.props.style).toEqual({ left: -48, top: -48 });
  });

  it("ignores pointer events", () => {
    const { UNSAFE_root } = render(<ScanFrame x={0} y={0} />);
    const container = UNSAFE_root.findAllByType(View)[0]!;
    expect(container.props.pointerEvents).toBe("none");
  });
});
