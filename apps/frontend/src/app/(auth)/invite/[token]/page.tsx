import { InviteAcceptView } from "@/features/invitations";

export const metadata = {
  title: "Tham gia tổ chức",
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function Page({ params }: PageProps) {
  const { token } = await params;
  return <InviteAcceptView token={token} />;
}
