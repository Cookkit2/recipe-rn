import React from "react";
import { View } from "react-native";

export const GoogleMaps = {
  View: React.forwardRef((props: any, ref: any) => {
    return (
      <View
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
    return <View ref={ref} {...props} testID="AppleMapView" />;
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
