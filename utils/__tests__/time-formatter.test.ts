import { formatDuration } from "../time-formatter";

jest.mock("date-fns", () => ({
  formatDistanceStrict: jest.fn(),
}));

import { formatDistanceStrict } from "date-fns";

describe("formatDuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 'less than a second' for durations under 1000ms", () => {
    expect(formatDuration(0)).toBe("less than a second");
    expect(formatDuration(999)).toBe("less than a second");
    expect(formatDuration(500)).toBe("less than a second");
  });

  it("should call formatDistanceStrict for durations 1000ms or more", () => {
    (formatDistanceStrict as jest.Mock).mockReturnValue("2 minutes");

    const result = formatDuration(125000);

    expect(formatDistanceStrict).toHaveBeenCalledWith(new Date(0), new Date(125000), {
      unit: "second",
      roundingMethod: "floor",
    });
    expect(result).toBe("2 minutes");
  });

  it("should handle exactly 1000ms", () => {
    (formatDistanceStrict as jest.Mock).mockReturnValue("1 second");

    const result = formatDuration(1000);

    expect(formatDistanceStrict).toHaveBeenCalled();
    expect(result).toBe("1 second");
  });

  it("should handle large durations", () => {
    (formatDistanceStrict as jest.Mock).mockReturnValue("1 hour 30 minutes");

    const result = formatDuration(5400000);

    expect(result).toBe("1 hour 30 minutes");
  });
});
