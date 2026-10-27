import { TitlePage } from "@/components/title-page";

export default async function MoviePage({ params }: PageProps<"/film/[id]">) {
  const { id } = await params;
  return <TitlePage mediaType="movie" rawId={id} />;
}
