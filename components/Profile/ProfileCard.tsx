import React, { useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Separator } from "../ui/separator";
import { H2, H4, P } from "../ui/typography";
import { database, storage } from "~/data";
import { PROFILE_IMAGE_KEY, PROFILE_NAME_KEY } from "~/constants/storage-keys";

export default function ProfileCard() {
  const [ingredients, setIngredients] = React.useState(0);
  const [recipes, setRecipes] = React.useState(0);

  useEffect(() => {
    const fetchIngredients = async () => {
      const ingredientCount = await database.ingredients.count();
      setIngredients(ingredientCount);
      const recipeCount = await database.recipes.count();
      setRecipes(recipeCount);
    };

    fetchIngredients();
  }, []);

  return (
    <Card className="mx-6 shadow-md shadow-foreground/10 rounded-3xl border-continuous">
      <CardContent className="flex-row py-6 gap-3">
        <View className="flex-1 items-center gap-1">
          <View
            className="rounded-full overflow-hidden"
            style={styles.profileCard}
          >
            <Image
              source={{ uri: storage.get(PROFILE_IMAGE_KEY) || undefined }}
              style={styles.profileCard}
            />
          </View>
          <H2 className="font-urbanist-semibold text-center">
            {storage.get(PROFILE_NAME_KEY)}
          </H2>
        </View>
        <View className="px-4 justify-center">
          <H4 className="font-urbanist-semibold">{ingredients}</H4>
          <P className="text-sm text-foreground/80 font-urbanist-medium">
            Ingredients
          </P>
          <Separator className="my-2" />
          <H4 className="font-urbanist-semibold">{recipes}</H4>
          <P className="text-sm text-foreground/80 font-urbanist-medium">
            Recipes cooked
          </P>
          {/* <Separator className="my-2" /> */}
          {/* <H4 className="font-urbanist-semibold">0</H4>
          <P className="text-sm text-foreground/80 font-urbanist-medium">
            Years chef experience
          </P> */}
        </View>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    width: 80,
    height: 80,
  },
});
