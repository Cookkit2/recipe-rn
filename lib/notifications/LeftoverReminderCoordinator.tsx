import { lazy, Suspense, useEffect, useState } from "react";
import { scheduleAfterInitialRender } from "~/lib/schedule-after-render";

const Reconciler = lazy(() => import("./LeftoverReminderReconciler"));

/** Notification-tap listeners stay immediate; background reconciliation can wait. */
export default function LeftoverReminderCoordinator() {
  const [ready, setReady] = useState(false);
  useEffect(() => scheduleAfterInitialRender(() => setReady(true)), []);
  return ready ? (
    <Suspense fallback={null}>
      <Reconciler />
    </Suspense>
  ) : null;
}
