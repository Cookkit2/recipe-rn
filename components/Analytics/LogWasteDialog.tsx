import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { P } from "~/components/ui/typography";
import { PlusIcon, Trash2Icon } from "lucide-uniwind";
import { useRecordWaste } from "~/hooks/queries/useWasteAnalyticsQueries";
import { cn } from "~/lib/utils";

type WasteReason = "expired" | "spoiled" | "excess" | "accidental" | null;

const WASTE_REASONS: Array<{ value: WasteReason; label: string; description: string }> = [
  { value: "expired", label: "Expired", description: "Past its expiration date" },
  { value: "spoiled", label: "Spoiled", description: "Went bad before expiration" },
  { value: "excess", label: "Too Much", description: "Had more than needed" },
  { value: "accidental", label: "Accidental", description: "Dropped, lost, or other" },
];

interface LogWasteDialogProps {
  stockId?: string;
  stockName?: string;
  stockQuantity?: number;
  stockUnit?: string;
  onSuccess?: () => void;
}

export function LogWasteDialog({
  stockId: initialStockId = "",
  stockName: initialStockName = "",
  stockQuantity: initialStockQuantity = 0,
  stockUnit: initialStockUnit = "",
  onSuccess,
}: LogWasteDialogProps) {
  const [open, setOpen] = useState(false);
  const [stockId, setStockId] = useState(initialStockId);
  const [stockName, setStockName] = useState(initialStockName);
  const [quantity, setQuantity] = useState(
    initialStockQuantity > 0 ? String(initialStockQuantity) : ""
  );
  const [unit, setUnit] = useState(initialStockUnit);
  const [reason, setReason] = useState<WasteReason>(null);
  const [estimatedCost, setEstimatedCost] = useState("");
  const [errors, setErrors] = useState<{
    stockName?: string;
    quantity?: string;
  }>({});

  const recordWaste = useRecordWaste();

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!stockName.trim()) {
      newErrors.stockName = "Please enter an item name";
    }

    if (!quantity.trim() || Number(quantity) <= 0) {
      newErrors.quantity = "Please enter a valid quantity";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // If no stockId provided, create a temporary entry with just the name
    const finalStockId = stockId || `temp-${Date.now()}-${Crypto.randomUUID()}`;

    recordWaste.mutate(
      {
        stockId: finalStockId,
        quantityWasted: Number(quantity),
        data: {
          reason: reason || undefined,
          wasteDate: Date.now(),
          estimatedCost: estimatedCost ? Math.round(Number(estimatedCost) * 100) : undefined,
        },
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // Reset form
          setStockId(initialStockId);
          setStockName(initialStockName);
          setQuantity(initialStockQuantity > 0 ? String(initialStockQuantity) : "");
          setUnit(initialStockUnit);
          setReason(null);
          setEstimatedCost("");
          setErrors({});
          setOpen(false);
          onSuccess?.();
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      }
    );
  };

  const ReasonButton = ({ value, label }: { value: WasteReason; label: string }) => (
    <Button
      variant={reason === value ? "default" : "outline"}
      className={cn("flex-1", reason === value && "border-primary")}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setReason(value);
      }}
    >
      <P className={cn(reason === value ? "text-primary-foreground" : "text-foreground")}>
        {label}
      </P>
    </Button>
  );

  const content = (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-urbanist-bold text-lg">Log Waste</DialogTitle>
        <DialogDescription className="font-urbanist-regular text-sm">
          Record wasted food to track your impact
        </DialogDescription>
      </DialogHeader>

      <ScrollView className="max-h-96">
        <View className="gap-4">
          {/* Item Name */}
          <View className="gap-2">
            <Label nativeID="stock-name">Item Name</Label>
            <Input
              id="stock-name"
              value={stockName}
              onChangeText={setStockName}
              placeholder="e.g., Milk, Bread, etc."
              className={cn(errors.stockName && "border-destructive")}
            />
            {errors.stockName && (
              <P className="text-destructive text-xs font-urbanist-medium">{errors.stockName}</P>
            )}
          </View>

          {/* Quantity */}
          <View className="gap-2">
            <Label nativeID="quantity">Quantity</Label>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input
                  id="quantity"
                  value={quantity}
                  onChangeText={(text) => {
                    setQuantity(text);
                    if (errors.quantity) setErrors({ ...errors, quantity: undefined });
                  }}
                  placeholder="1"
                  keyboardType="decimal-pad"
                  className={cn(errors.quantity && "border-destructive")}
                />
              </View>
              <View className="w-24">
                <Input value={unit} onChangeText={setUnit} placeholder="unit" />
              </View>
            </View>
            {errors.quantity && (
              <P className="text-destructive text-xs font-urbanist-medium">{errors.quantity}</P>
            )}
          </View>

          {/* Reason */}
          <View className="gap-2">
            <Label>Reason</Label>
            <View className="flex-row gap-2 flex-wrap">
              {WASTE_REASONS.map((r) => (
                <View key={r.value || "none"} className="flex-1 min-w-[45%]">
                  <ReasonButton value={r.value} label={r.label} />
                </View>
              ))}
            </View>
          </View>

          {/* Estimated Cost (Optional) */}
          <View className="gap-2">
            <Label nativeID="cost">Estimated Cost (Optional)</Label>
            <View className="flex-row items-center gap-2">
              <Input
                id="cost"
                value={estimatedCost}
                onChangeText={setEstimatedCost}
                placeholder="0.00"
                keyboardType="decimal-pad"
                className="flex-1"
              />
              <P className="text-muted-foreground font-urbanist-medium">$</P>
            </View>
          </View>
        </View>
      </ScrollView>

      <DialogFooter>
        <View className="flex-row gap-2 w-full">
          <Button variant="outline" className="flex-1" onPress={() => setOpen(false)}>
            <P className="text-foreground">Cancel</P>
          </Button>
          <Button className="flex-1" onPress={handleSubmit} disabled={recordWaste.isPending}>
            <P className="text-primary-foreground">Save</P>
          </Button>
        </View>
      </DialogFooter>
    </DialogContent>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setOpen(true);
          }}
        >
          <PlusIcon className="text-foreground" size={18} strokeWidth={3} />
        </Button>
      </DialogTrigger>
      {content}
    </Dialog>
  );
}

export default LogWasteDialog;
