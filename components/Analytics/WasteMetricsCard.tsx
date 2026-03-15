import React from "react";
import { View } from "react-native";
import { Card, CardContent } from "~/components/ui/card";
import { H4, P } from "~/components/ui/typography";

interface WasteMetricsCardProps {
  itemsWasted?: number;
  moneyWasted?: number;
  co2FromWaste?: number;
}

export default function WasteMetricsCard({
  itemsWasted = 0,
  moneyWasted = 0,
  co2FromWaste = 0,
}: WasteMetricsCardProps) {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCO2 = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(amount);
  };

  return (
    <Card className="flex-1 mx-6 mt-6 rounded-3xl shadow-md shadow-foreground/10 border-none">
      <CardContent className="py-6 gap-4">
        <View>
          <H4 className="font-urbanist-bold mb-1">Waste Overview</H4>
          <P className="text-sm text-foreground/70 font-urbanist-medium">
            Track your food waste impact
          </P>
        </View>

        <View className="flex-row justify-between gap-2">
          <View className="flex-1 bg-primary/5 rounded-2xl p-4 items-center">
            <P className="text-3xl font-urbanist-bold text-primary mb-1">{itemsWasted}</P>
            <P className="text-xs text-foreground/70 font-urbanist-medium text-center">
              Items Wasted
            </P>
          </View>

          <View className="flex-1 bg-secondary/5 rounded-2xl p-4 items-center">
            <P className="text-3xl font-urbanist-bold text-secondary mb-1">
              {formatMoney(moneyWasted)}
            </P>
            <P className="text-xs text-foreground/70 font-urbanist-medium text-center">
              Money Wasted
            </P>
          </View>

          <View className="flex-1 bg-accent/5 rounded-2xl p-4 items-center">
            <P className="text-3xl font-urbanist-bold text-accent mb-1">
              {formatCO2(co2FromWaste)}
              {"kg"}
            </P>
            <P className="text-xs text-foreground/70 font-urbanist-medium text-center">
              CO₂ Impact
            </P>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}
