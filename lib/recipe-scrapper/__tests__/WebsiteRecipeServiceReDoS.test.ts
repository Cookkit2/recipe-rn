import { extractMicrodata } from "../WebsiteRecipeService";

describe("WebsiteRecipeService ReDoS", () => {
  it("does not take exponentially long with a malicious string", () => {
    // Malicious payload aiming for ReDoS on `getAttrValue`'s regex
    // e.g. `attr\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))`
    const attrName = "content";
    const maliciousPayload = "<meta " + attrName + "=".padEnd(50000, " ") + "/>";

    const startTime = Date.now();
    // Use an unescaped regex via getting it to run on our payload
    const result = extractMicrodata(maliciousPayload);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100);
  });
});
