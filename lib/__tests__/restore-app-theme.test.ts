import { Uniwind } from "uniwind";
import { storageFacade } from "~/data/storage";
import { PREF_COLOR_SCHEME_KEY } from "~/constants/storage-keys";

jest.mock("uniwind", () => ({ Uniwind: { setTheme: jest.fn() } }));
jest.mock("~/data/storage", () => ({ storageFacade: { get: jest.fn() } }));

afterEach(() => jest.clearAllMocks());

it.each(["dark", "light", "system"])(
  "restores the saved %s preference during startup module evaluation",
  (preference) => {
    (storageFacade.get as jest.Mock).mockReturnValue(preference);

    jest.isolateModules(() => {
      require("../restore-app-theme");
      // The first navigator render happens after this module has been imported.
      expect(Uniwind.setTheme).toHaveBeenCalledWith(preference);
    });

    expect(storageFacade.get).toHaveBeenCalledWith(PREF_COLOR_SCHEME_KEY);
  }
);

it.each([null, "unknown", 1, {}])(
  "keeps the system default for an invalid preference %p",
  (value) => {
    (storageFacade.get as jest.Mock).mockReturnValue(value);
    jest.isolateModules(() => require("../restore-app-theme"));
    expect(Uniwind.setTheme).not.toHaveBeenCalled();
  }
);

it("still starts when reading the saved preference fails", () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  (storageFacade.get as jest.Mock).mockImplementation(() => {
    throw new Error("Storage unavailable");
  });
  expect(() => jest.isolateModules(() => require("../restore-app-theme"))).not.toThrow();
  expect(Uniwind.setTheme).not.toHaveBeenCalled();
  expect(warn).toHaveBeenCalledWith(
    "Could not restore saved appearance; using the system default."
  );
  warn.mockRestore();
});
