import React, { useState } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { View } from "react-native";
import { H4, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import EditProfileModal from "./EditProfileModal";

export default function SetupProfileCard() {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <EditProfileModal
        modalVisible={modalVisible}
        onCancel={() => setModalVisible(false)}
      />
      <Card className="mx-6 shadow-md shadow-foreground/10 rounded-3xl border-continuous">
        <CardContent className="flex-row py-6 gap-3">
          <View className="flex-1 gap-1">
            <H4 className="font-urbanist-semibold">Account</H4>
            <P className="text-sm text-foreground/80 font-urbanist-medium">
              Set up your profile to backup
            </P>
          </View>
          <Button
            variant="secondary"
            className="rounded-xl border-continuous"
            onPress={() => setModalVisible(true)}
          >
            <P className="font-urbanist-semibold">Set up</P>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
