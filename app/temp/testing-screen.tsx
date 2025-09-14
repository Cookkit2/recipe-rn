import { Trash2Icon } from "lucide-nativewind";
import { AnimatePresence } from "moti";
import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { InfinityGauntlet, sayHello } from "react-native-thanos-snap-animation";
import { DisintegrateButton } from "~/components/Camera/Disintegrate";
import GauntletImage from "~/components/Graunlet/GaunletImage";
import GauntletImage2 from "~/components/Graunlet/GaunletImage2";
import Gauntlet from "~/components/Graunlet/Graunlet";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { H1, P } from "~/components/ui/typography";
import * as ImagePicker from "expo-image-picker";

export default function App() {
  const { width, height } = useWindowDimensions();
  //States
  const [animationReady, setAnimationReady] = useState(false);
  const [timer, setTimer] = useState(0);
  const [snap, setSnap] = useState(false);

  const [pickedImage, setPickedImage] = useState<string | null>(null);
  //Refs
  const startTimeRef = useRef(0);

  const pickFromGallery = async () => {
    try {
      setAnimationReady(false);
      startTimeRef.current = Date.now();
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.2,
      });

      if (!result.canceled && result.assets?.[0]) {
        const selectedImage = result.assets[0];
        setPickedImage(selectedImage.uri);
      }
    } catch (error) {
      console.error("Error picking from gallery:", error);
    }
  };

  return (
    <View style={styles.container}>
      {pickedImage && (
        <Gauntlet
          // imageUrl={pickedImage}
          // imageSize={{ width: width, height: (width / 3) * 4 }}
          snap={snap}
          onAnimationPrepare={() => {}}
          onAnimationReady={() => {
            setAnimationReady(true);
            setTimer(Date.now() - startTimeRef.current);
            console.log("animation ready");
          }}
        >
          <Image
            source={{ uri: pickedImage }}
            style={{
              width: width,
              height: (width / 3) * 4,
            }}
          />
        </Gauntlet>
      )}
      {/* <GauntletImage
        snap={snap}
        onAnimationPrepare={() => {
          setAnimationReady(false);
          startTimeRef.current = Date.now();
        }}
        onAnimationReady={() => {
          setAnimationReady(true);
          setTimer(Date.now() - startTimeRef.current);
          console.log("animation ready");
        }}
        imageUrl={"~/assets/images/placeholder.png"}
        imageSize={{ width: 100, height: 100 }}
      /> */}

      <Button onPress={pickFromGallery}>
        <Text>Pick Image</Text>
      </Button>

      <Button
        disabled={!animationReady}
        onPress={() => {
          setSnap((prev) => !prev);
        }}
      >
        {animationReady ? (
          <>
            {/* <Image
              source={require("./assets/snap-logo.png")}
              style={styles.snapImage}
              resizeMode={"contain"}
            /> */}
            <Text>{`Init took: ${timer}ms`}</Text>
          </>
        ) : (
          <>
            <ActivityIndicator size={"small"} />
            <Text>Preparing Animation</Text>
          </>
        )}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    marginTop: 100,
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
  snapButton: {
    minWidth: 150,
    maxWidth: 380,
    minHeight: 90,
    backgroundColor: "#F1F1F0",
    borderWidth: 1,
    borderColor: "black",
    position: "absolute",
    bottom: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  snapImage: {
    width: 90,
    height: 90,
  },
});
