import { Marquee } from "~/components/Onboarding/Marque";
import { View } from "react-native";
import { dummyPantryItems } from "~/data/dummy/dummy-data";
import OutlinedImage from "~/components/ui/outlined-image";
import { H1, P } from "~/components/ui/typography";
import RotationCard from "../Shared/RotationCard";

const previewImages = dummyPantryItems.map((item) => item.image_url);

export default function MarqueList() {
  return (
    <>
      <Marquee duration={100000}>
        <View className="flex-row gap-28">
          {Array.from(
            { length: Math.ceil(previewImages.length / 2) },
            (_, groupIndex) => {
              const firstIndex = groupIndex * 2;
              const secondIndex = firstIndex + 1;
              const hasSecondImage = secondIndex < previewImages.length;

              return (
                <View
                  key={`card-group-${groupIndex}`}
                  className="relative mr-4"
                >
                  {/* First card */}
                  <RotationCard index={firstIndex} total={previewImages.length}>
                    {previewImages[firstIndex] && (
                      <OutlinedImage
                        source={previewImages[firstIndex]}
                        size={100}
                        strokeColor="#ffffff"
                        strokeWidth={3}
                      />
                    )}
                  </RotationCard>

                  {/* Second card stacked behind/offset */}
                  {hasSecondImage && previewImages[secondIndex] && (
                    <RotationCard
                      index={secondIndex}
                      className="absolute top-10 left-24 -z-10"
                      total={previewImages.length}
                    >
                      <OutlinedImage
                        source={previewImages[secondIndex]}
                        size={100}
                        strokeColor="#ffffff"
                        strokeWidth={3}
                      />
                    </RotationCard>
                  )}
                </View>
              );
            }
          )}
        </View>
      </Marquee>
      <View>
        <H1 className="text-center">Kitch</H1>
        {/* <H1 className="font-light tracking-wider px-3 text-foreground">
              Your ingredients inventory,
            </H1>
            <H1 className="font-light tracking-wider text-foreground mt-1 px-4">
              tailored recipes.
            </H1> */}

        <P className="mt-6 text-foreground/80 px-4 text-center">
          Track your ingredients {"\n"}
          and discover tailored recipes
        </P>
      </View>
      <Marquee duration={100000}>
        <View className="flex-row gap-28">
          {Array.from(
            { length: Math.ceil(previewImages.length / 2) },
            (_, groupIndex) => {
              const firstIndex = groupIndex * 2;
              const secondIndex = firstIndex + 1;
              const hasSecondImage = secondIndex < previewImages.length;

              return (
                <View
                  key={`card-group-${groupIndex}`}
                  className="relative mr-4"
                >
                  {/* First card */}
                  <RotationCard index={firstIndex} total={previewImages.length}>
                    {previewImages[firstIndex] && (
                      <OutlinedImage
                        source={previewImages[firstIndex]}
                        size={100}
                        strokeColor="#ffffff"
                        strokeWidth={3}
                      />
                    )}
                  </RotationCard>

                  {/* Second card stacked behind/offset */}
                  {hasSecondImage && previewImages[secondIndex] && (
                    <RotationCard
                      index={secondIndex}
                      className="absolute top-10 left-24 -z-10"
                      total={previewImages.length}
                    >
                      <OutlinedImage
                        source={previewImages[secondIndex]}
                        size={100}
                        strokeColor="#ffffff"
                        strokeWidth={3}
                      />
                    </RotationCard>
                  )}
                </View>
              );
            }
          )}
        </View>
      </Marquee>
    </>
  );
}
