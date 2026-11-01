import type { Card, Category } from "@/game/types";
import catalogue from "../../public/art/cards/credits.json";
export type CardPhoto = { file: string; title: string; subject: string; description: string; credit: string; licence: string; licenceUrl: string; source: string; modification: string };
export const cardPhoto = (id: string) => (catalogue as Record<string, CardPhoto>)[id];
const photos: Record<string, string> = { solar: "power", wind: "wind", "community-power": "power", "rapid-grid": "power", "rewilding-leap": "land", "emergency-levy": "governance", shipping: "ocean", wetlands: "ocean", adaptation: "ocean", "coastal-protection": "ocean", "loss-damage": "ocean", food: "food", agroecology: "food", "food-waste": "food", "clean-industry": "industry", methane: "industry", "methane-standard": "industry", removal: "science", "open-science": "science", "innovation-fund": "science", "skills-training": "science" };
const families: Record<Category, string> = { technology: "power", politics: "governance", economics: "industry", justice: "governance", awareness: "science", nature: "land" };
export function CardArt({ card, className = "", eager=false }: { card: Pick<Card, "id" | "category">; className?: string; eager?:boolean }) {
  const photo = cardPhoto(card.id);
  return <span className={`illustrated-art photo-art ${className}`} aria-hidden="true" style={{ backgroundImage: "none", backgroundSize: "cover", position: "relative" }}><img src={photo?.file ?? `/art/photos/${photos[card.id] ?? families[card.category]}.webp`} alt="" loading={eager?"eager":"lazy"} decoding="async" width={860} height={580} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/></span>;
}
export function CardPhotoCaption({ id }: { id: string }) {
  const photo = cardPhoto(id);
  return photo ? <p className="photo-caption"><a href={photo.source} target="_blank" rel="noreferrer">{photo.title}</a> · {photo.credit} · <a href={photo.licenceUrl} target="_blank" rel="noreferrer">{photo.licence}</a></p> : null;
}
export function FamilyArt({ category }: { category: Category }) { return <CardArt card={{ id: "family", category }}/>; }
