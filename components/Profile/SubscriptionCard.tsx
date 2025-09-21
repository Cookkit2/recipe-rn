import React, { useState } from "react";
import { View } from "react-native";
import {
  isValidSubscription,
  presentPaywallIfNeeded,
} from "~/utils/subscription-utils";
import { Card, CardContent } from "../ui/card";
import { H4, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { useAsyncEffect } from "~/utils/use-async-effect";
import type { PurchasesEntitlementInfo } from "react-native-purchases";

export default function SubscriptionCard() {
  const [currentEntitlements, setCurrentEntitlements] =
    useState<PurchasesEntitlementInfo | null>(null);

  useAsyncEffect(
    async () => {
      const entitlements = await isValidSubscription();
      setCurrentEntitlements(entitlements || null);
    },
    async () => {},
    []
  );

  const currentDate = new Date();
  const expiredDate = new Date(currentEntitlements?.expirationDateMillis ?? 0);

  const expiredInDays = Math.ceil(
    (expiredDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="flex-1 mx-6 mt-6 rounded-3xl shadow-md shadow-foreground/10 border-none">
      <CardContent className="flex-row py-6 gap-3">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center">
            <H4 className="font-urbanist-bold">Cookkit</H4>
            {currentEntitlements && (
              <View className="rounded-full bg-primary/10 px-3 ml-2">
                <P className="text-sm text-primary font-urbanist-medium">Pro</P>
              </View>
            )}
          </View>
          {currentEntitlements ? (
            <P className="text-sm text-foreground/80 font-urbanist-medium">
              Your{" "}
              {currentEntitlements.periodType === "TRIAL"
                ? "trial"
                : "subscription"}{" "}
              ends in {expiredInDays} {expiredInDays === 1 ? "day" : "days"}.
            </P>
          ) : (
            <P className="text-sm text-foreground/80 font-urbanist-medium">
              Start your free trial.
            </P>
          )}
        </View>
        {!currentEntitlements && (
          <Button
            variant="default"
            className="rounded-xl border-continuous"
            onPress={() => presentPaywallIfNeeded()}
          >
            <P className="font-urbanist-semibold text-primary-foreground">
              Subscribe
            </P>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
