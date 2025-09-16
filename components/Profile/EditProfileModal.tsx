import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { EyeIcon, EyeOffIcon } from "lucide-nativewind";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { H4, P } from "../ui/typography";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import UploadPictureIcon from "./UploadPictureIcon";
import BaseModal from "../ui/modal";
import { useAuthActions } from "~/auth";
import { storage } from "~/data";
import { toast } from "sonner-native";

// Zod validation schema
const profileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters"),
  email: z.email("Please enter a valid email").min(1, "Email is required"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function EditProfileModal({
  modalVisible,
  onCancel,
}: {
  modalVisible: boolean;
  onCancel: () => void;
}) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [profileImage, setProfileImage] = React.useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = React.useState(false);
  const { signUpWithEmail } = useAuthActions();

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  // Watch the name field to update profileName state
  const watchedName = watch("name");

  const handleImageSelected = (imageUri: string) => {
    setProfileImage(imageUri);
    // Add your image handling logic here
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (isSigningUp) return; // Prevent multiple submissions
    setIsSigningUp(true);

    try {
      const result = await signUpWithEmail({
        email: data.email,
        password: data.password,
      });

      console.log("Sign Up Result:", result);

      if (result.success) {
        storage.set("profileName", data.name);
        storage.set("profileImage", profileImage);
        onCancel();
      } else if (result.error) {
        toast.error(result.error.message || "Sign up failed");
      }
    } catch (error) {
      console.error("Sign Up Error:", error);
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <BaseModal modalVisible={modalVisible} onCancel={onCancel}>
      <View className="bg-primary rounded-4xl p-4 max-w-xs w-full shadow-2xl border-continuous">
        <H4 className="font-urbanist-bold text-primary-foreground text-center mb-8">
          Hello, <Text className="font-bowlby-one">{watchedName}</Text>
        </H4>
      </View>

      {/* Forms */}
      <View className="bg-background rounded-4xl p-6 w-full shadow-xl border-continuous flex items-center -mt-8">
        <UploadPictureIcon onImageSelected={handleImageSelected} />

        {/* Name Input */}
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="default"
              placeholder="Enter your name"
              autoFocus={true}
              selectTextOnFocus={true}
              className="w-full mb-2"
              error={!!errors.name?.message}
            />
          )}
        />
        <ErrorText text={errors.name?.message} />

        {/* Email Input */}
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              placeholder="Enter your email"
              autoCapitalize="none"
              autoCorrect={false}
              className="w-full mb-2"
              error={!!errors.email?.message}
            />
          )}
        />
        <ErrorText text={errors.email?.message} />

        {/* Password Input with Show/Hide Toggle */}
        <View className="w-full relative mb-2">
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                className="w-full pl-12 pr-12 text-center"
                error={!!errors.password?.message}
              />
            )}
          />
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center"
          >
            {showPassword ? (
              <EyeOffIcon
                className="text-muted-foreground"
                size={20}
                strokeWidth={2}
              />
            ) : (
              <EyeIcon
                className="text-muted-foreground"
                size={20}
                strokeWidth={2}
              />
            )}
          </Pressable>
        </View>
        <ErrorText text={errors.password?.message} />

        <P className="text-sm font-urbanist-regular text-muted-foreground text-center mt-2">
          Set up your profile to correctly backup your data
        </P>

        <Button
          className="min-w-full mt-4 rounded-2xl bg-foreground flex-row justify-center items-center gap-2"
          onPress={handleSubmit(onSubmit)}
          disabled={isSigningUp}
        >
          {isSigningUp && <ActivityIndicator size="small" />}
          <P className="font-urbanist-semibold text-background">Confirm</P>
        </Button>
      </View>
    </BaseModal>
  );
}

const ErrorText = ({ text }: { text: string | undefined }) =>
  text && (
    <P className="font-urbanist-regular text-destructive text-sm mb-3 self-center">
      {text}
    </P>
  );
