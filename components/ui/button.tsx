import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Pressable } from "react-native";
import { TextClassContext } from "~/components/ui/text";
import { cn } from "~/lib/utils";
import Animated from "react-native-reanimated";
import useOnPressScale from "~/hooks/animation/useOnPressScale";
import useDebounce from "~/hooks/useDebounce";

const buttonVariants = cva(
  "group flex items-center justify-center rounded-md web:ring-offset-background web:transition-colors web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary web:hover:opacity-90 active:opacity-90",
        destructive: "bg-destructive web:hover:opacity-90 active:opacity-90",
        outline:
          "border border-input bg-background web:hover:bg-accent web:hover:text-accent-foreground active:bg-accent",
        secondary: "bg-secondary web:hover:opacity-80 active:opacity-80",
        ghost:
          "web:hover:bg-accent web:hover:text-accent-foreground active:bg-accent",
        link: "web:underline-offset-4 web:hover:underline web:focus:underline",
      },
      size: {
        default: "h-10 px-4 py-2 native:h-12 native:px-5 native:py-3",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8 native:h-14",
        icon: "h-10 w-10",
        "icon-lg": "h-12 w-12",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const buttonTextVariants = cva(
  "web:whitespace-nowrap text-sm native:text-base font-medium text-foreground web:transition-colors",
  {
    variants: {
      variant: {
        default: "text-primary-foreground",
        destructive: "text-destructive-foreground",
        outline: "group-active:text-accent-foreground",
        secondary:
          "text-secondary-foreground group-active:text-secondary-foreground",
        ghost: "group-active:text-accent-foreground",
        link: "text-primary group-active:underline",
      },
      size: {
        default: "",
        sm: "",
        lg: "native:text-lg",
        icon: "",
        "icon-sm": "",
        "icon-lg": "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonProps = React.ComponentProps<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    containerClassName?: string;
    debounceDelay?: number;
    enableDebounce?: boolean;
    enableAnimation?: boolean;
  };

function Button({
  ref,
  className,
  variant,
  size,
  containerClassName,
  debounceDelay = 300,
  enableDebounce = true,
  onPress,
  enableAnimation = true,
  ...props
}: ButtonProps) {
  const { animatedStyle, handlePressIn, handlePressOut } = useOnPressScale();

  // Apply debouncing to onPress if enabled
  const debouncedOnPress = useDebounce(onPress || noop, {
    delay: debounceDelay,
    immediate: true,
  });

  const handlePress = enableDebounce ? debouncedOnPress : onPress || noop;

  return (
    <TextClassContext.Provider
      value={buttonTextVariants({
        variant,
        size,
        className: "web:pointer-events-none",
      })}
    >
      <Animated.View style={animatedStyle} className={containerClassName}>
        <Pressable
          className={cn(
            props.disabled && "opacity-50 web:pointer-events-none",
            buttonVariants({ variant, size, className })
          )}
          onPressIn={enableAnimation ? handlePressIn : undefined}
          onPressOut={enableAnimation ? handlePressOut : undefined}
          onPress={handlePress}
          ref={ref}
          role="button"
          style={(state) => [
            typeof props.style === "function"
              ? props.style(state)
              : props.style,
            { borderCurve: "continuous" },
          ]}
          {...props}
        />
      </Animated.View>
    </TextClassContext.Provider>
  );
}

const noop = () => {};

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
