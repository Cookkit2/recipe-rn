import React, { useEffect, useState } from "react";
import { 
  View, 
  type LayoutChangeEvent, 
  Modal, 
  TextInput, 
  Pressable,
  Alert 
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  type SharedValue,
  withTiming,
} from "react-native-reanimated";
import { H4, P } from "./ui/typography";
import { Button } from "./ui/button";
import { CURVES } from "~/constants/curves";
import { Input } from "./ui/input";

function Digit({ value, place }: { value: number; place: number }) {
  const valueRoundedToPlace = Math.floor(value / place) % 10;
  const animatedValue = useSharedValue(valueRoundedToPlace);

  useEffect(() => {
    animatedValue.value = withTiming(
      valueRoundedToPlace,
      CURVES["expressive.fast.spatial"]
    );
  }, [animatedValue, valueRoundedToPlace]);

  return (
    <View className="relative overflow-hidden w-5 h-6">
      <View className="opacity-0">
        <H4 className="text-center font-urbanist-medium">0</H4>
      </View>
      {Array.from({ length: 10 }, (_, i) => (
        <Number key={i} mv={animatedValue} number={i} />
      ))}
    </View>
  );
}

function Number({ mv, number }: { mv: SharedValue<number>; number: number }) {
  const [bounds, setBounds] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBounds({ width, height });
  };

  const animatedStyle = useAnimatedStyle(() => {
    if (!bounds?.height)
      return {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        transform: [{ translateY: 0 }],
      };

    const latest = mv.value;
    const placeValue = latest % 10;
    const offset = (10 + number - placeValue) % 10;
    let memo = offset * bounds.height;
    if (offset > 5) {
      memo -= 10 * bounds.height;
    }

    return {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      transform: [{ translateY: memo }],
    };
  });

  // Render invisible measurement text first
  if (!bounds?.height) {
    return (
      <H4
        onLayout={handleLayout}
        className="absolute top-0 left-0 right-0 opacity-0 text-center"
      >
        {number}
      </H4>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <H4 className="text-center font-urbanist-medium">{number}</H4>
    </Animated.View>
  );
}

export function SlidingNumber({
  value,
  padStart = false,
  decimalSeparator = ".",
  onValueChange,
  editable = true,
}: {
  value: number;
  padStart?: boolean;
  decimalSeparator?: string;
  onValueChange?: (newValue: number) => void;
  editable?: boolean;
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  const absValue = Math.abs(value);
  const [integerPart, decimalPart] = absValue.toString().split(".");
  const integerValue = parseInt(integerPart ?? "0", 10);

  const paddedInteger =
    padStart && integerValue < 10 ? `0${integerPart}` : integerPart;

  const integerDigits = paddedInteger?.split("");
  const integerPlaces = integerDigits?.map((_, i) =>
    Math.pow(10, integerDigits.length - i - 1)
  );

  const handlePress = () => {
    if (editable && onValueChange) {
      setInputValue(value.toString());
      setModalVisible(true);
    }
  };

  const handleSubmit = () => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) {
      Alert.alert("Invalid Input", "Please enter a valid number");
      return;
    }
    
    if (onValueChange) {
      onValueChange(numValue);
    }
    setModalVisible(false);
  };

  const handleCancel = () => {
    setInputValue(value.toString());
    setModalVisible(false);
  };

  const numberDisplay = (
    <View className="flex flex-row items-center justify-center">
      {value < 0 && <H4 className="text-center font-urbanist-medium">-</H4>}
      {integerDigits?.map((_, index) => (
        <Digit
          key={`pos-${integerPlaces ? integerPlaces[index] : 0}`}
          value={integerValue}
          place={integerPlaces && integerPlaces[index] ? integerPlaces[index] : 1}
        />
      ))}
      {decimalPart && (
        <>
          <H4 className="text-center font-urbanist-medium">
            {decimalSeparator}
          </H4>
          {decimalPart.split("").map((_, index) => (
            <Digit
              key={`decimal-${index}`}
              value={parseInt(decimalPart, 10)}
              place={10 ** (decimalPart.length - index - 1)}
            />
          ))}
        </>
      )}
    </View>
  );

  return (
    <>
      {editable && onValueChange ? (
        <Pressable onPress={handlePress}>
          {numberDisplay}
        </Pressable>
      ) : (
        numberDisplay
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCancel}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-2xl border-continuous">
            <H4 className="mb-6 font-urbanist-bold text-foreground">
              Enter Quantity
            </H4>
            
            <Input
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="decimal-pad"
              autoFocus={true}
              selectTextOnFocus={true}
              onSubmitEditing={handleSubmit}
            />
            
            <View className="flex-row gap-3 mt-6 justify-end">
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onPress={handleCancel}
              >
                <P className="font-urbanist-semibold text-foreground">Cancel</P>
              </Button>
              
              <Button
                className="w-full rounded-xl"
                onPress={handleSubmit}
              >
                <P className="font-urbanist-semibold text-primary-foreground">Confirm</P>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
