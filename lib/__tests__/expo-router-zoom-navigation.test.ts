import { getNavigateAction } from "expo-router/build/global-state/getNavigationAction";
import { createInitialState } from "expo-router/build/react-navigation/core/createInitialState";
import { INTERNAL_EXPO_ROUTER_ZOOM_TRANSITION_SOURCE_ID_PARAM_NAME as ZOOM_SOURCE } from "expo-router/build/navigationParams";

jest.mock("expo-router/build/global-state/getRouteInfoFromState", () => ({
  getRouteInfoFromState: () => ({ segments: [], params: {}, pathname: "/" }),
}));

function navigateToDetail(name: string, zoomSource?: string, nested = true) {
  const index = { type: "route", route: "index", children: [], loadRoute: () => ({}) };
  const detail = {
    type: nested ? "layout" : "route",
    route: name,
    children: nested ? [index] : [],
    loadRoute: () => ({}),
  };
  const targetParams = {
    itemId: "test-item",
    ...(zoomSource ? { [ZOOM_SOURCE]: zoomSource } : {}),
  };
  const targetState = {
    routes: [
      {
        name,
        ...(nested
          ? { state: { routes: [{ name: "index", params: targetParams }] } }
          : { params: targetParams }),
      },
    ],
  };
  const initialState = createInitialState({ routeNames: ["index", name], parentChain: "root" });
  return getNavigateAction(
    "/detail/test-item",
    {},
    {
      registry: new Map() as never,
      routeNode: {
        type: "layout",
        route: "",
        children: [index, detail],
        loadRoute: () => ({}),
      } as never,
      linking: { config: { screens: {} }, getStateFromPath: () => targetState } as never,
    },
    "NAVIGATE",
    undefined,
    undefined,
    undefined,
    {
      ...initialState,
      type: "stack",
    } as never
  );
}

it.each(["recipes/[recipeId]", "ingredient/[ingredientId]"])(
  "preserves the image zoom source on the pushed %s layout",
  (name) => {
    const result = navigateToDetail(name, "list-image-source");
    expect(result.status).toBe("action");
    if (result.status !== "action") throw new Error("Expected navigation action");
    expect(result.action.payload).toMatchObject({
      name,
      params: { [ZOOM_SOURCE]: "list-image-source" },
      state: { routes: [{ name: "index", params: { itemId: "test-item" } }] },
    });
  }
);

it("keeps flat image links and ordinary nested navigation working", () => {
  const flat = navigateToDetail("detail", "list-image-source", false);
  if (flat.status !== "action") throw new Error("Expected navigation action");
  expect(flat.action.payload).toMatchObject({ params: { [ZOOM_SOURCE]: "list-image-source" } });
  const ordinary = navigateToDetail("recipes/[recipeId]");
  if (ordinary.status !== "action") throw new Error("Expected navigation action");
  expect((ordinary.action.payload as { params: object }).params).not.toHaveProperty(ZOOM_SOURCE);
});
