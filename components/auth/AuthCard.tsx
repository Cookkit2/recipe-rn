import React from "react";
import { View, type ViewProps } from "react-native";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { cn } from "~/lib/utils";

interface AuthCardProps extends ViewProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, className, ...props }: AuthCardProps) {
  return (
    <Card
      className={cn("w-full max-w-sm mx-auto bg-card/95 backdrop-blur-sm", className)}
      {...props}
    >
      {(title || subtitle) && (
        <CardHeader className="space-y-2 text-center">
          {title && <Text className="text-2xl font-bold text-card-foreground">{title}</Text>}
          {subtitle && <Text className="text-sm text-muted-foreground">{subtitle}</Text>}
        </CardHeader>
      )}
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

interface AuthContainerProps extends ViewProps {
  children: React.ReactNode;
}

export function AuthContainer({ children, className, ...props }: AuthContainerProps) {
  return (
    <View className={cn("flex-1 justify-center px-6 py-8 bg-background", className)} {...props}>
      {children}
    </View>
  );
}
