import React, { Fragment } from "react";
import { MotiText } from "moti";
import { H1 } from "~/components/ui/typography";
import { EASE_IN_OUT_SMOOTH } from "~/components/ui/BlurFadeText";

type TitleTrailProps = {
  text: string;
  /** Initial delay before starting the trail (ms) */
  delayMs?: number;
  /** Additional delay per word (ms) */
  perWordDelayMs?: number;
  /** Vertical offset for the enter animation */
  fromTranslateY?: number;
  /** Animation duration per word (ms) */
  durationMs?: number;
  className?: string;
};

/**
 * Renders a headline where each word animates in sequence
 * with a subtle fade + upward motion, similar to a trail effect.
 */
export default function TextTrail({
  text,
  delayMs = 0,
  perWordDelayMs = 60,
  fromTranslateY = 12,
  durationMs = 380,
  className,
}: TitleTrailProps) {
  const words = React.useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  return (
    <H1 className={className}>
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          {index > 0 ? " " : null}
          <MotiText
            from={{ opacity: 0, translateY: fromTranslateY }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: "timing",
              duration: durationMs,
              delay: delayMs + index * perWordDelayMs,
              easing: EASE_IN_OUT_SMOOTH,
            }}
          >
            {word}
          </MotiText>
        </Fragment>
      ))}
    </H1>
  );
}
