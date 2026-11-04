import Link from "next/link";
import photos from "../../../public/art/photos/credits.json";
import background from "../../../public/art/photos/background-credit.json";
import cardPhotos from "../../../public/art/cards/credits.json";
import { V6_CARDS } from "@/game/v6";
import { POLICY_CARDS } from "@/game/policy-catalogue";
export default function Credits() {
  return <main className="about-main" id="main-content"><h1>Photo & sound credits</h1><p>The game uses real photographs from Wikimedia Commons and NASA. Historic events and people are illustrative; they do not endorse the game or the fictional policy outcomes. Each converted/cropped photograph retains the licence listed below.</p>
    <div className="photo-credit-grid">{Object.entries(cardPhotos).map(([id,photo])=><section key={id}><img src={photo.file} alt="" width={300} height={180} loading="lazy"/><h2>{POLICY_CARDS.find(card=>card.photo===id)?.title??V6_CARDS.find(card=>card.id===id)?.title??photo.subject}</h2><h3>{photo.title}</h3><p>{photo.credit}</p><p><a href={photo.source}>Original image & caption</a> · <a href={photo.licenceUrl}>{photo.licence}</a> · <a href={`/art/cards/${id}.licence.txt`}>Attribution record</a></p><details><summary>Caption & changes</summary><p>{photo.description}</p><p>{photo.modification}</p></details></section>)}</div>
    {photos.map(photo => <section key={photo.name}><h2>{photo.title.replace(/<[^>]+>/g, "")}</h2><p>{photo.credit} · {photo.id}</p><p><a href={photo.source}>Original photo & caption</a> · <a href={photo.terms}>NASA media use guidance</a></p><p>{photo.modification}</p></section>)}
    <section><h2>Background: {background.title}</h2><p>{background.credit} · {background.width} × {background.height}</p><p><a href={background.source}>Original photograph</a> · <a href={background.terms}>NASA media use guidance</a></p><p>{background.modification}</p></section>
    <section id="everest-photo"><h2>Mount Everest and Nuptse from Kala Patthar</h2><p>Pavel Novak, via Wikimedia Commons.</p><p><a href="https://commons.wikimedia.org/wiki/File:Everest_nubtse.jpg">Original photograph</a> · <a href="https://creativecommons.org/licenses/by-sa/2.5/">CC BY-SA 2.5</a></p><p>Resized and converted to WebP under the same licence. The opening screen crops and shades the image with CSS.</p></section>
    <section><h2>Flags</h2><p><a href="https://flagicons.lipis.dev/">flag-icons</a>, by Lipis and contributors. MIT licence. <a href="/flags/LICENSE.txt">Licence text</a>.</p></section><section><h2>Sound effects</h2><p>Original synthesised tones generated locally with Web Audio. Use the speaker button to mute.</p></section><Link href="/" className="button primary">Back to game</Link>
  </main>;
}
