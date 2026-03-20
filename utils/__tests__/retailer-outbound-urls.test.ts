import { build99SpeedmartMapsUrl, buildGoogleMapsSearchNearUrl } from "../retailer-outbound-urls";

describe("retailer-outbound-urls", () => {
  it("buildGoogleMapsSearchNearUrl encodes query and coords", () => {
    const url = buildGoogleMapsSearchNearUrl("99 Speedmart", 3.14, 101.69, 12);
    expect(url).toContain("google.com/maps/search");
    expect(url).toContain("99%20Speedmart");
    expect(url).toContain("@3.14,101.69,12z");
  });

  it("build99SpeedmartMapsUrl uses 99 Speedmart query", () => {
    const url = build99SpeedmartMapsUrl(3, 101);
    expect(url).toContain("99%20Speedmart");
  });
});
