import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createAppCookingAgent } from "~/lib/agent/create-app-agent";
import { AssistantChat } from "~/components/Assistant/AssistantChat";

export default function AssistantScreen() {
  const queryClient = useQueryClient();
  const agent = useMemo(() => createAppCookingAgent(queryClient), [queryClient]);
  return <AssistantChat agent={agent} />;
}
