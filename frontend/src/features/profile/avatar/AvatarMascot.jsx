import algwas from "@/assets/mascots/algwas_idle_body.svg";
import connie from "@/assets/mascots/connie-avatar.svg";
import orange from "@/assets/mascots/orange-avatar.svg";
import commend from "@/assets/mascots/lesson-commend.svg";
import beanie from "@/assets/mascots/accessory-beanie.svg";
import glasses from "@/assets/mascots/accessory-glasses.svg";
import headband from "@/assets/mascots/accessory-headband.svg";
import propeller from "@/assets/mascots/accessory-propeller-cap.svg";
import charm from "@/assets/mascots/accessory-charm.svg";
import { characterNames } from "./avatar-model";
import "@/features/onboarding/styles/onboarding.css";
import "./avatar.css";

export const accessoryArtwork = {
  beanie: { src: beanie, width: 75.0934, height: 57.792 },
  glasses: { src: glasses, width: 98.3461, height: 40.127 },
  headband: { src: headband, width: 90.3495, height: 42.8935 },
  "propeller-cap": { src: propeller, width: 80.9067, height: 55.7634 },
  charm: { src: charm, width: 28.6475, height: 62.5675 },
};

// Pose-specific attachment coordinates; no paths, colors or artwork are altered.
const artwork = {
  algwas: { src: algwas, width: 138.965, height: 190.999, head: [41, -7, .8], eyes: [35, 32, .7], charm: [105, 69, .45] },
  connie: { src: connie, width: 148.125, height: 239.804, head: [45, 61, .8], eyes: [43, 100, .64], charm: [106, 135, .45] },
  orange: { src: orange, width: 250, height: 229, head: [80, 21, 1.2], eyes: [62, 83, 1.3], charm: [171, 127, .65] },
  commend: { src: commend, width: 220, height: 258, head: [77, 54, .9], eyes: [73, 101, .75], charm: [149, 134, .45] },
};

export function AvatarMascot({ character = "algwas", equipped = {}, celebration = false }) {
  const id = Object.hasOwn(characterNames, character) ? character : "algwas";
  const pose = celebration && id === "algwas" ? artwork.commend : artwork[id];
  const scale = 190 / pose.height;
  return <div className="avatar-mascot" data-character={id} aria-label={`${characterNames[id]}, your learning companion`} role="img">
    <div className="avatar-mascot__art" style={{ width: pose.width * scale, height: 190 }}>
      <div className="avatar-mascot__size" style={{ width: pose.width, height: pose.height, transform: `scale(${scale})` }}>
        <div className="avatar-mascot__breathing" style={{ width: pose.width, height: pose.height }}>
          <img src={pose.src} width={pose.width} height={pose.height} alt="" draggable="false" />
          {Object.entries(equipped).map(([slot, itemId]) => {
            const item = accessoryArtwork[itemId], anchor = pose[slot];
            if (!item || !anchor) return null;
            return <span key={slot} className="avatar-mascot__accessory" data-accessory={itemId}
              style={{ left: anchor[0], top: anchor[1], transform: `scale(${anchor[2]})` }}>
              <img src={item.src} width={item.width} height={item.height} alt="" draggable="false" />
            </span>;
          })}
        </div>
      </div>
    </div>
    <span className="avatar-mascot__shadow" aria-hidden="true" />
  </div>;
}
