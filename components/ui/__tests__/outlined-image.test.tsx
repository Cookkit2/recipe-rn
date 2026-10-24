import { act, render, waitFor } from "@testing-library/react-native";
import OutlinedImage from "../outlined-image";
import { outlinedThumbnail } from "~/lib/outlined-thumbnail";

jest.mock("~/lib/outlined-thumbnail", () => ({ outlinedThumbnail: jest.fn() }));
jest.mock("expo-image", () => ({
  Image: (props: Record<string, unknown>) =>
    require("react").createElement(require("react-native").View, {
      ...props,
      testID: "thumbnail-image",
    }),
}));

it("retains the existing outline while baking and replaces nine views with one cached image", async () => {
  let finish!: (uri: string) => void;
  jest.mocked(outlinedThumbnail).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  const screen = await render(<OutlinedImage source="file:///ingredient.png" size={64} />);
  expect(screen.getAllByTestId("thumbnail-image")).toHaveLength(9);
  await waitFor(() => expect(outlinedThumbnail).toHaveBeenCalled());
  await act(async () => {
    finish("file:///outlined.png");
  });
  expect(screen.getAllByTestId("thumbnail-image")).toHaveLength(1);
  expect(screen.getByTestId("thumbnail-image").props.source).toEqual({
    uri: "file:///outlined.png",
  });
});
