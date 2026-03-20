import { isLatLngInMalaysia, MALAYSIA_BBOX } from "../geo-malaysia";

describe("isLatLngInMalaysia", () => {
  it("returns true for Kuala Lumpur approx", () => {
    expect(isLatLngInMalaysia(3.139, 101.6869)).toBe(true);
  });

  it("returns true for Kota Kinabalu approx", () => {
    expect(isLatLngInMalaysia(5.9804, 116.0735)).toBe(true);
  });

  it("returns false for Singapore", () => {
    expect(isLatLngInMalaysia(1.3521, 103.8198)).toBe(false);
  });

  it("returns false for Bangkok", () => {
    expect(isLatLngInMalaysia(13.7563, 100.5018)).toBe(false);
  });

  it("documents bbox sanity", () => {
    expect(MALAYSIA_BBOX.minLat).toBeLessThan(MALAYSIA_BBOX.maxLat);
    expect(MALAYSIA_BBOX.minLng).toBeLessThan(MALAYSIA_BBOX.maxLng);
  });
});
