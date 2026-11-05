import { redirect } from "next/navigation";
import { resolveCancelCode } from "@/lib/customerCancellation";

export const dynamic = "force-dynamic";

export default async function ShortCancelLinkPage({ params }: { params: { code: string } }) {
  const path = await resolveCancelCode(params.code);
  redirect(path ?? "/cancel/invalid/invalid");
}
