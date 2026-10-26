import type { MediaType, Status } from "./schema";

export const STATUS_LABELS: Record<Status, string> = {
  watched: "Vu",
  watching: "En cours",
  planned: "À voir",
  dropped: "Abandonné",
};

export const MEDIA_LABELS: Record<MediaType, string> = {
  movie: "Film",
  tv: "Série",
};

export function titleHref(t: { mediaType: MediaType; id: number }) {
  return t.mediaType === "movie" ? `/film/${t.id}` : `/serie/${t.id}`;
}
