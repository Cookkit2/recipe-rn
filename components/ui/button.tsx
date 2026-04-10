import React, { useCallback, useMemo } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Pressable, type GestureResponderEvent, type Insets } from "react-native";
import { TextClassContext } from "~/components/ui/text";
import { cn } from "~/lib/utils";
import Animated from "react-native-reanimated";
import useDebounce from "~/hooks/useDebounce";
import useButtonAnimation from "~/hooks/animation/useButtonAnimations";
import * as Haptics from "expo-haptics";

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
        ghost: "web:hover:bg-accent web:hover:text-accent-foreground active:bg-accent",
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
        secondary: "text-secondary-foreground group-active:text-secondary-foreground",
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
    accessibilityLabel?: string;
    accessibilityHint?: string;
    accessibilityRole?: string;
  };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const Button = React.forwardRef<React.ComponentRef<typeof Pressable>, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      containerClassName,
      debounceDelay = 100,
      enableDebounce = true,
      onPress,
      enableAnimation = true,
      accessibilityRole = "button",
      ...props
    }: ButtonProps,
    ref
  ) => {
    const { animatedStyle, roundedStyle, onPressIn, onPressOut } =
      useButtonAnimation(enableAnimation);

    // Apply debouncing to onPress if enabled
    const debouncedOnPress = useDebounce(onPress || noop, {
      delay: debounceDelay,
      immediate: true,
    });

    const handlePress = useCallback(
      (e: GestureResponderEvent) => {
        if (enableDebounce) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          debouncedOnPress(e);
        } else if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress(e);
        }
      },
      [debouncedOnPress, enableDebounce, onPress]
    );
    // Ensure minimum 44x44 touch target using hitSlop
    const hitSlop = useMemo(() => {
      let hitSlop: Insets | undefined;
      switch (size) {
        case "icon-sm":
          hitSlop = { top: 6, bottom: 6, left: 6, right: 6 };
          break;
        case "icon":
          hitSlop = { top: 2, bottom: 2, left: 2, right: 2 };
          break;
        case "default":
          hitSlop = { top: 2, bottom: 2 };
          break;
        case "sm":
          hitSlop = { top: 4, bottom: 4 };
          break;
        default:
          hitSlop = undefined;
      }
      return hitSlop;
    }, [size]);

    return (
      <TextClassContext.Provider
        value={buttonTextVariants({
          variant,
          size,
          className: "web:pointer-events-none",
        })}
      >
        <Animated.View style={animatedStyle} className={cn(containerClassName, "overflow-hidden")}>
          <AnimatedPressable
            className={cn(
              props.disabled && "opacity-50 web:pointer-events-none",
              "border-continuous",
              buttonVariants({ variant, size, className })
            )}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={handlePress}
            hitSlop={hitSlop}
            ref={ref}
            role="button"
            accessibilityRole={accessibilityRole}
            style={[props.style, roundedStyle]}
            {...props}
            accessibilityState={{ disabled: !!props.disabled, ...props.accessibilityState }}
          />
        </Animated.View>
      </TextClassContext.Provider>
    );
  }
);

const noop = () => {};

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
