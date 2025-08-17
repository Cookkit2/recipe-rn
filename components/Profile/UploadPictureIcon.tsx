import { UploadCloudIcon } from "lucide-nativewind";
import React from "react";
import { Pressable, Image } from "react-native";
import Animated from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import useOnPressScale from "~/hooks/animation/useOnPressScale";

interface UploadPictureIconProps {
  onImageSelected?: (imageUri: string) => void;
}

export default function UploadPictureIcon({
  onImageSelected,
}: UploadPictureIconProps) {
  const { animatedStyle, handlePressIn, handlePressOut } = useOnPressScale();
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

  const pickImage = async () => {
    // Request permission
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      alert("Permission to access camera roll is required!");
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      setSelectedImage(imageUri);
      onImageSelected?.(imageUri);
    }
  };

  return (
    <Animated.View style={[animatedStyle]}>
      <Pressable
        className="rounded-full bg-background border-foreground/20 border-4 aspect-square w-20 h-20 flex items-center justify-center mb-6 overflow-hidden"
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={pickImage}
      >
        {selectedImage ? (
          <Image
            source={{ uri: selectedImage }}
            className="w-full h-full rounded-full"
            resizeMode="cover"
          />
        ) : (
          <UploadCloudIcon
            className="text-foreground"
            size={24}
            strokeWidth={2.618}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}
