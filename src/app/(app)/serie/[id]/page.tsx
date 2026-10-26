import { TitlePage } from "@/components/title-page";

export default async function ShowPage({ params }: PageProps<"/serie/[id]">) {
  const { id } = await params;
  return <TitlePage mediaType="tv" rawId={id} />;
}
