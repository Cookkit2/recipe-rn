import React from "react";

// Avoid importing from react-native -- it can resolve to a worktree's
// unconfigured copy.  Use a minimal React element instead.
const MockView = React.forwardRef<any, any>((props, ref) =>
  React.createElement("View", { ...props, ref })
);

export const GoogleMaps = {
  View: React.forwardRef((props: any, ref: any) => {
    return (
      <MockView
        ref={ref}
        {...props}
        testID="MapView"
        onMarkerClick={(e: any) => {
          if (props.onMarkerClick) {
            props.onMarkerClick(e);
          }
        }}
      />
    );
  }),
  MapType: {
    NORMAL: "NORMAL",
    SATELLITE: "SATELLITE",
    HYBRID: "HYBRID",
    TERRAIN: "TERRAIN",
  },
  MapColorScheme: {
    LIGHT: "LIGHT",
    DARK: "DARK",
  },
};

export const AppleMaps = {
  View: React.forwardRef((props: any, ref: any) => {
    return React.createElement("View", { ...props, ref, testID: "AppleMapView" });
  }),
  MapType: {
    STANDARD: "STANDARD",
    SATELLITE: "SATELLITE",
    HYBRID: "HYBRID",
  },
};

export const requestPermissionsAsync = jest.fn();
export const getPermissionsAsync = jest.fn();
export const useLocationPermissions = jest.fn();
