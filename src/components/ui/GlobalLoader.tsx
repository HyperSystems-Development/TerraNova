import { useLoadingStore } from "@/stores/loadingStore";
import { LoadingDialog } from "./LoadingDialog";

export function GlobalLoader() {
  const count = useLoadingStore((s) => s.count);
  const message = useLoadingStore((s) => s.message);
  return <LoadingDialog open={count > 0} message={message ?? undefined} />;
}
