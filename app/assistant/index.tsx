import { useMemo } from "react";
import { createAppCookingAgent } from "~/lib/agent/create-app-agent";
import { AssistantChat } from "~/components/Assistant/AssistantChat";

export default function AssistantScreen() {
  const agent = useMemo(() => createAppCookingAgent(), []);
  return <AssistantChat agent={agent} />;
}
