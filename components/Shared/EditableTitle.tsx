import React, { useRef, useState } from "react";
import { Pressable, TextInput, View, Text } from "react-native";
import { cn } from "~/lib/utils";

type EditableTitleProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  autoSelectOnEdit?: boolean;
  textClassName?: string;
  onSubmitEditing?: () => void;
  onBeginEditing?: () => void;
  onEndEditing?: () => void;
  TextComponent?: "Title" |"H1" | "H2" | "H3" | "H4" | "P";
};

const TYPOGRAPHY_BASE = {
  Title: "web:scroll-m-20 text-4xl text-foreground font-extrabold tracking-tight lg:text-5xl web:select-text font-bowlby-one pt-2",
  H1: "web:scroll-m-20 text-4xl text-foreground font-extrabold tracking-tight lg:text-5xl web:select-text",
  H2: "web:scroll-m-20 pb-2 text-3xl text-foreground font-semibold tracking-tight first:mt-0 web:select-text",
  H3: "web:scroll-m-20 text-2xl text-foreground font-semibold tracking-tight web:select-text",
  H4: "web:scroll-m-20 text-xl text-foreground font-semibold tracking-tight web:select-text",
  P: "text-base text-foreground web:select-text",
} as const;

export default function EditableTitle({
  value,
  onChangeText,
  placeholder = "Title",
  TextComponent = "H1",
  editable = true,
  autoSelectOnEdit = true,
  textClassName,
  onSubmitEditing,
  onBeginEditing,
  onEndEditing,
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [textHeight, setTextHeight] = useState<number | undefined>(undefined);
  const inputRef = useRef<TextInput>(null);

  const inputStyle = React.useMemo(
    () => ({
      height: textHeight,
      paddingVertical: 0,
      includeFontPadding: false,
    }),
    [textHeight]
  );

  const beginEditing = React.useCallback(() => {
    if (!editable) return;
    setIsEditing(true);
    onBeginEditing?.();
  }, [editable, onBeginEditing]);

  const endEditing = React.useCallback(() => {
    setIsEditing(false);
    onEndEditing?.();
  }, [onEndEditing]);

  return (
    <View className="relative">
      {!isEditing ? (
        <Pressable onPress={beginEditing} role="button" disabled={!editable}>
          <Text
            numberOfLines={2}
            className={cn(
              !value && "text-muted-foreground",
              TYPOGRAPHY_BASE[TextComponent],
              textClassName
            )}
            onLayout={(e) => setTextHeight(e.nativeEvent.layout.height - 2)}
          >
            {value?.length ? value : placeholder}
          </Text>
        </Pressable>
      ) : (
        <>
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            multiline
            scrollEnabled={false}
            textAlignVertical="center"
            autoFocus={autoSelectOnEdit}
            selectTextOnFocus={autoSelectOnEdit}
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
            underlineColorAndroid="transparent"
            onSubmitEditing={() => {
              onSubmitEditing?.();
              endEditing();
            }}
            onBlur={endEditing}
            className={cn(
              "z-[1000] bg-transparent",
              TYPOGRAPHY_BASE[TextComponent],
              textClassName
            )}
            style={inputStyle}
          />
        </>
      )}
    </View>
  );
}
