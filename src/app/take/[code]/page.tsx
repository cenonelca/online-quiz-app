import { redirect } from "next/navigation";

// Deep links to /take/<code> (e.g. from an older QR code or bookmark) now land
// on the unified /join intake form, pre-filled with this passkey.
export default async function TakeQuizLanding({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/join?code=${encodeURIComponent(code)}`);
}
