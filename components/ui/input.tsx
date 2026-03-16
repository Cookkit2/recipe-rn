import React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "~/lib/utils";

type InputProps = TextInputProps & {
  error?: boolean;
};

const Input = React.forwardRef<TextInput, InputProps>(({ className, error, ...props }, ref) => {
  return (
    <TextInput
      ref={ref}
      className={cn(
        "web:flex h-10 native:h-12 web:w-full rounded-lg bg-muted px-3 web:py-2 text-base lg:text-sm native:text-lg native:leading-[1.25] placeholder:text-muted-foreground font-urbanist-semibold web:ring-offset-background file:border-0 file:bg-transparent file:font-medium web:focus-visible:outline-none text-center border-continuous",
        props.editable === false && "opacity-50 web:cursor-not-allowed",
        error && "border-2 border-destructive",
        className
      )}
      {...props}
    />
  );
});

export { Input };
