import React, { useState } from "react";
import { View } from "react-native";
import PlanCard from "./PlanCard";

export interface SubscriptionPlan {
  id: string;
  price: string;
  priceSubtext: string;
  description: string;
}

export default function PlanList() {
  const [selectedPlan, setSelectedPlan] = useState<string>("yearly");

  return (
    <View className="flex gap-4">
      {subscriptionPlans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isSelected={selectedPlan === plan.id}
          onSelect={() => setSelectedPlan(plan.id)}
        />
      ))}
    </View>
  );
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "monthly",
    price: "RM19.90",
    priceSubtext: "/ Monthly",
    description: "Monthly Flex. Cancel Anytime",
  },
  {
    id: "yearly",
    price: "RM49.90/yr",
    priceSubtext: " (RM 4.16/mo)",
    description: "Most Choice with Saving of 79%",
  },
  {
    id: "lifetime",
    price: "RM149.90",
    priceSubtext: "/ Lifetime",
    description: "Pay Once. Lifetime Access",
  },
];
