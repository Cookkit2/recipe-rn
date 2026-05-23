import React from "react";
import { render } from "@testing-library/react-native";
import StarRating from "../StarRating";

// Mock lucide-uniwind
jest.mock("lucide-uniwind", () => ({
  StarIcon: () => null,
}));

describe("StarRating", () => {
  it("renders without crashing with rating 0", () => {
    const { UNSAFE_root } = render(<StarRating rating={0} />);
    expect(UNSAFE_root.children.length).toBeGreaterThan(0);
  });

  it("renders in display-only mode", () => {
    const { UNSAFE_root } = render(<StarRating rating={3.5} />);
    expect(UNSAFE_root).toBeDefined();
  });
});
