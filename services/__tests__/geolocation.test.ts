import { openDirections } from "../geolocation";
import * as Linking from "expo-linking";

jest.mock("expo-linking", () => ({
  createURL: jest.fn(),
  canOpenURL: jest.fn(),
  openURL: jest.fn(),
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

describe("openDirections", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should open URL when supported", async () => {
    (Linking.createURL as jest.Mock).mockReturnValue("mock-url");
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);

    await openDirections({ latitude: 1, longitude: 2 }, "mock-label");

    expect(Linking.createURL).toHaveBeenCalledWith(
      "https://www.google.com/maps/dir/?api=1&destination=1,2&destination_place_id=mock-label"
    );
    expect(Linking.canOpenURL).toHaveBeenCalledWith("mock-url");
    expect(Linking.openURL).toHaveBeenCalledWith("mock-url");
  });

  it("should throw an error when URL is not supported", async () => {
    (Linking.createURL as jest.Mock).mockReturnValue("mock-url");
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);

    await expect(openDirections({ latitude: 1, longitude: 2 }, "mock-label")).rejects.toThrow(
      "Cannot open directions"
    );

    expect(Linking.createURL).toHaveBeenCalledWith(
      "https://www.google.com/maps/dir/?api=1&destination=1,2&destination_place_id=mock-label"
    );
    expect(Linking.canOpenURL).toHaveBeenCalledWith("mock-url");
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
