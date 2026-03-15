import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { EyeIcon, EyeOffIcon } from "lucide-uniwind";
import { H4, P } from "~/components/ui/typography";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import UploadPictureIcon from "./UploadPictureIcon";
import BaseModal from "~/components/ui/modal";
import { useAuthActions } from "~/auth";
import { storage } from "~/data";
import { toast } from "sonner-native";
import { PROFILE_IMAGE_KEY, PROFILE_NAME_KEY } from "~/constants/storage-keys";
import { log } from "~/utils/logger";

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
};

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

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<FormErrors>({});

  const handleImageSelected = (imageUri: string) => {
    setProfileImage(imageUri);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    // Validate email
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    // Validate password
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async () => {
    if (isSigningUp) return;

    if (!validateForm()) {
      return;
    }

    setIsSigningUp(true);

    try {
      const result = await signUpWithEmail({
        email: email,
        password: password,
      });

      log.info("Sign Up Result:", result);

      if (result.success) {
        storage.set(PROFILE_NAME_KEY, name);
        storage.set(PROFILE_IMAGE_KEY, profileImage);
        onCancel();
      } else if (result.error) {
        toast.error(result.error.message || "Sign up failed");
      }
    } catch (error) {
      log.error("Sign Up Error:", error);
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <BaseModal modalVisible={modalVisible} onCancel={onCancel}>
      <View className="bg-primary rounded-4xl p-4 max-w-xs w-full shadow-2xl border-continuous">
        <H4 className="font-urbanist-bold text-primary-foreground text-center mb-8">
          Hello, <Text className="font-bowlby-one">{name}</Text>
        </H4>
      </View>

      {/* Forms */}
      <View className="bg-background rounded-4xl p-6 w-full shadow-xl border-continuous flex items-center -mt-8">
        <UploadPictureIcon onImageSelected={handleImageSelected} />

        {/* Name Input */}
        <Input
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errors.name) {
              setErrors({ ...errors, name: undefined });
            }
          }}
          keyboardType="default"
          placeholder="Enter your name"
          autoFocus={true}
          selectTextOnFocus={true}
          className="w-full mb-2"
          error={!!errors.name}
        />
        <ErrorText text={errors.name} />

        {/* Email Input */}
        <Input
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (errors.email) {
              setErrors({ ...errors, email: undefined });
            }
          }}
          keyboardType="email-address"
          placeholder="Enter your email"
          autoCapitalize="none"
          autoCorrect={false}
          className="w-full mb-2"
          error={!!errors.email}
        />
        <ErrorText text={errors.email} />

        {/* Password Input with Show/Hide Toggle */}
        <View className="w-full relative mb-2">
          <Input
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) {
                setErrors({ ...errors, password: undefined });
              }
            }}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            className="w-full pl-12 pr-12 text-center"
            error={!!errors.password}
          />
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center"
          >
            {showPassword ? (
              <EyeOffIcon className="text-muted-foreground" size={20} strokeWidth={2} />
            ) : (
              <EyeIcon className="text-muted-foreground" size={20} strokeWidth={2} />
            )}
          </Pressable>
        </View>
        <ErrorText text={errors.password} />

        <P className="text-sm font-urbanist-regular text-muted-foreground text-center mt-2">
          Set up your profile to correctly backup your data
        </P>

        <Button
          className="min-w-full mt-4 rounded-2xl bg-foreground flex-row justify-center items-center gap-2"
          onPress={onSubmit}
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
  text && <P className="font-urbanist-regular text-destructive text-sm mb-3 self-center">{text}</P>;
