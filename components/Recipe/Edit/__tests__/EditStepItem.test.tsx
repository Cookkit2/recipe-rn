import React from "react";
import { render } from "@testing-library/react-native";
import EditStepItem from "../EditStepItem";

jest.mock("~/components/ui/button", () => ({
  Button: require("react-native").Pressable,
}));
jest.mock("~/components/ui/typography", () => ({
  P: require("react-native").Text,
}));
jest.mock("lucide-uniwind", () => ({
  GripVerticalIcon: () => null,
  Trash2Icon: () => null,
}));

it("keeps all step text inside native text controls", async () => {
  const screen = await render(
    <EditStepItem
      step={{
        step: 1,
        title: "Rinse rice",
        description: "Rinse the rice before cooking.",
        relatedIngredientIds: [],
      }}
      onChange={jest.fn()}
      onDelete={jest.fn()}
    />
  );

  expect(screen.toJSON()).not.toBeNull();
});
