import React from "react";
import { H3, H4, P } from "~/components/ui/typography";
import { View } from "react-native";
import {
  BookOpenIcon,
  RefrigeratorIcon,
  AppleIcon,
  WifiIcon,
  CalendarIcon,
  BarChart2Icon,
  type LucidePropsWithClassName,
  HeartIcon,
} from "lucide-nativewind";

type PlanFeature = {
  name: string;
  description: string;
  icon: (props: LucidePropsWithClassName) => React.ReactNode;
  soon: boolean;
};

const features: PlanFeature[] = [
  {
    name: "Variety of Recipes",
    description: "Access to 1000+ recipes",
    icon: BookOpenIcon,
    soon: false,
  },
  {
    name: "Smart Pantry",
    description: "AI-powered ingredient substitutions",
    icon: RefrigeratorIcon,
    soon: false,
  },
  {
    name: "Recipe Favorites",
    description: "Save your favorite recipes",
    icon: HeartIcon,
    soon: false,
  },
  {
    name: "Fresh Ingredients",
    description: "Smart pantry tracking",
    icon: AppleIcon,
    soon: false,
  },
  {
    name: "Offline Access",
    description: "Access recipes without internet",
    icon: WifiIcon,
    soon: false,
  },
  {
    name: "Meal Planning",
    description: "Personalised weekly meal planning",
    icon: CalendarIcon,
    soon: true,
  },
  {
    name: "Nutrition Analytics",
    description: "Nutritional insights & analytics",
    icon: BarChart2Icon,
    soon: true,
  },
] as const;

export default function FeatureList() {
  return (
    <>
      <H3 className="mt-24 font-bowlby-one">Features</H3>
      <View className="mt-2 space-y-4">
        {features.map((feature) => {
          const IconComponent = feature.icon;
          return (
            <View
              key={feature.name}
              className="flex-row items-center py-4 rounded-2xl"
            >
              <View className="w-12 h-12 mr-4 rounded-full items-center justify-center">
                <IconComponent
                  size={32}
                  className="text-foreground/80"
                  strokeWidth={2.618}
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <H4 className="font-urbanist-bold mb-1">{feature.name}</H4>
                  {feature.soon && (
                    <View className="rounded-full bg-primary/10 px-3 ml-2">
                      <P className="text-sm text-primary font-urbanist-medium">
                        Soon
                      </P>
                    </View>
                  )}
                </View>
                <P className="text-foreground/60 font-urbanist-regular text-sm">
                  {feature.description}
                </P>
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
}
