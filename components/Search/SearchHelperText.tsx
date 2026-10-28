import type { ReactNode } from "react";
import { P } from "~/components/ui/typography";

/** Keep Search and AI helper copy at the same readable size and alignment. */
export function SearchHelperText({ children }: { children: ReactNode }) {
  return (
    <P className="text-lg font-urbanist-medium text-muted-foreground text-center">{children}</P>
  );
}
