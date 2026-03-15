import React, { useState } from "react";
import { Pressable, Text, Modal, View, StyleSheet, Platform } from "react-native";
import { Card, CardContent } from "~/components/ui/card";
import { format } from "date-fns";
import { H4, P } from "~/components/ui/typography";
import { useIngredientDetailStore } from "~/store/IngredientDetailContext";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

export default function DateSection() {
  const { pantryItem, updatePantryItem } = useIngredientDetailStore();
  const [purchasedDateOpen, setPurchasedDateOpen] = useState(false);
  const [expiresDateOpen, setExpiresDateOpen] = useState(false);

  const updateDate = (type: "expiry_date" | "purchase_date", date: Date) => {
    updatePantryItem({ ...pantryItem, [type]: date });
  };

  const onExpiryDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setExpiresDateOpen(false);
    }
    if (selectedDate) {
      updateDate("expiry_date", selectedDate);
    }
  };

  const onPurchaseDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setPurchasedDateOpen(false);
    }
    if (selectedDate) {
      updateDate("purchase_date", selectedDate);
    }
  };

  const renderDatePicker = () => {
    if (Platform.OS === "ios") {
      return (
        <>
          {/* Expires Date Modal for iOS */}
          <Modal visible={expiresDateOpen} transparent={true} animationType="slide">
            <View className="flex-1 justify-end">
              <View className="bg-background rounded-t-3xl py-5 flex items-center shadow-md">
                <View className="w-full flex-row justify-between items-center border-b border-border pb-3 px-5">
                  <Pressable className="flex-[1]" onPress={() => setExpiresDateOpen(false)}>
                    <P className="text-foreground/80">Cancel</P>
                  </Pressable>
                  <View className="flex-[2] flex items-center justify-center">
                    <H4>Select Expiry Date</H4>
                  </View>
                  <Pressable
                    className="flex-[1] items-end"
                    onPress={() => setExpiresDateOpen(false)}
                  >
                    <P className="text-foreground/80">Done</P>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={pantryItem.expiry_date || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={onExpiryDateChange}
                  style={styles.datePicker}
                  minimumDate={new Date()}
                />
              </View>
            </View>
          </Modal>

          {/* Purchase Date Modal for iOS */}
          <Modal visible={purchasedDateOpen} transparent={true} animationType="slide">
            <View className="flex-1 justify-end">
              <View className="bg-background rounded-t-3xl py-5 flex items-center shadow-md">
                <View className="w-full flex-row justify-between items-center border-b border-border pb-3 px-5">
                  <Pressable className="flex-[1]" onPress={() => setPurchasedDateOpen(false)}>
                    <P className="text-foreground/80">Cancel</P>
                  </Pressable>
                  <View className="flex-[2] flex items-center justify-center">
                    <H4>Select Purchase Date</H4>
                  </View>
                  <Pressable
                    className="flex-[1] items-end"
                    onPress={() => setPurchasedDateOpen(false)}
                  >
                    <P className="text-foreground/80">Done</P>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={pantryItem.created_at}
                  mode="date"
                  display="spinner"
                  onChange={onPurchaseDateChange}
                  style={styles.datePicker}
                />
              </View>
            </View>
          </Modal>
        </>
      );
    } else {
      // Android date pickers
      return (
        <>
          {expiresDateOpen && (
            <DateTimePicker
              value={pantryItem.expiry_date || new Date()}
              mode="date"
              display="default"
              onChange={onExpiryDateChange}
              minimumDate={new Date()}
            />
          )}
          {purchasedDateOpen && (
            <DateTimePicker
              value={pantryItem.created_at}
              mode="date"
              display="default"
              onChange={onPurchaseDateChange}
            />
          )}
        </>
      );
    }
  };

  return (
    <>
      <Card className="flex-1 mx-12 mt-6 rounded-3xl shadow-md shadow-foreground/10 border-none">
        <CardContent className="flex gap-2 p-5 items-center">
          <Pressable onPress={() => setExpiresDateOpen(true)}>
            <H4 className="font-urbanist-semibold text-center">
              Expires on{" "}
              <Text className="text-primary">
                {format(pantryItem.expiry_date || new Date(), "d MMM yyyy")}
              </Text>
            </H4>
          </Pressable>
          <Pressable onPress={() => setPurchasedDateOpen(true)}>
            <P className="text-sm font-urbanist-regular tracking-wider text-foreground/80 text-center">
              Purchased on {format(pantryItem.created_at, "d MMM yyyy")}
            </P>
          </Pressable>
        </CardContent>
      </Card>
      {renderDatePicker()}
    </>
  );
}

const styles = StyleSheet.create({
  datePicker: {
    height: 200,
  },
});
