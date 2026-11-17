import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/adapters/http/api";
import { Button } from "@/components/ui/Button";
import { PageTitle } from "@/components/layout/PageTitle";
import { AvatarMascot, accessoryArtwork } from "./AvatarMascot";
import { characterNames, toggleAccessory } from "./avatar-model";
import star from "@/assets/mascots/reward-star.svg";
import comingSoon from "@/assets/mascots/accessory-coming-soon.svg";

export function AvatarPage() {
  const [saved, setSaved] = useState(null);
  const [character, setCharacter] = useState("algwas");
  const [equipped, setEquipped] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; load(); return () => { mounted.current = false; }; }, []);
  const load = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setMessage("");
    try {
      const { avatar } = await api("/avatar");
      if (mounted.current) { setSaved(avatar); setCharacter(avatar.character); setEquipped(avatar.equipped); setFailed(false); }
    } catch (error) { if (mounted.current) { setFailed(true); setMessage(error.message); } }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  };
  const mutate = async (path, method, body, success) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setMessage("");
    try {
      const { avatar } = await api(path, { method, body: JSON.stringify(body) });
      if (mounted.current) { setSaved(avatar); setMessage(success); }
    } catch (error) { if (mounted.current) setMessage(error.message); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  };
  return <section className="avatar-page">
    <PageTitle eyebrow="EDIT AVATAR" title="AVATAR" description="Customize your avatar!" action={<Link className="text-link" to="/profile">Back to profile</Link>} />
    {message && <p className="avatar-message" role="status">{message}</p>}
    {!saved ? <div className="panel">{failed ? <Button onClick={load} disabled={busy}>Try again</Button> : "Loading your avatar…"}</div> :
      <div className="avatar-editor">
        <div className="avatar-editor__character">
          <div className="avatar-preview"><AvatarMascot character={character} equipped={equipped} /></div>
          <h2>CHOOSE CHARACTER</h2>
          <div className="avatar-characters" role="group" aria-label="Choose character">{saved.characters.map(id => <button key={id} type="button"
            data-character-choice={id} aria-pressed={character === id} aria-label={characterNames[id]} disabled={busy}
            onClick={() => { setCharacter(id); setMessage(""); }}><span className={`avatar-swatch avatar-swatch--${id}`} aria-hidden="true" /><span>{characterNames[id]}</span></button>)}</div>
          <Button className="avatar-save" disabled={busy} onClick={() => mutate("/avatar", "PUT", { character, equipped }, "Avatar saved.")}>{busy ? "Please wait…" : "SAVE AVATAR"}</Button>
        </div>
        <section className="avatar-shop" aria-label="Accessories">
          <header><h2>ACCESSORIES</h2><span className="avatar-balance"><span className="avatar-star"><img src={star} width="59.1892" height="56.4682" alt="" /></span><span>{saved.balance} XP</span></span></header>
          <div className="avatar-accessories">{saved.catalog.map(item => {
            const art = accessoryArtwork[item.id], owned = saved.owned.includes(item.id), active = equipped[item.slot] === item.id;
            return <button type="button" key={item.id} data-item={item.id} disabled={busy || (!owned && saved.balance < item.cost)} aria-pressed={active}
              aria-label={owned ? `${active ? "Unequip" : "Equip"} ${item.name}` : `Buy ${item.name} for ${item.cost} XP`}
              onClick={() => owned ? (setEquipped(toggleAccessory(equipped, item, saved.owned)), setMessage("Choose SAVE AVATAR to keep your changes.")) : mutate("/avatar/purchases", "POST", { item_id: item.id }, `${item.name} purchased. Select it to equip, then save your avatar.`)}>
              <span className="avatar-accessory-icon"><span style={{ transform: `scale(${Math.min(1, 70 / art.width, 55 / art.height)})` }}><img src={art.src} width={art.width} height={art.height} alt="" /></span></span>
              <strong>{owned ? active ? "Equipped" : "Owned" : `${item.cost} XP`}</strong><small>{item.name}</small>
            </button>;
          })}<div className="avatar-coming-soon"><span className="avatar-locked-icon" aria-hidden="true"><img src={comingSoon} alt="" /></span><strong>Coming soon</strong></div></div>
          <p>Use your XP to unlock accessories.</p>
        </section>
      </div>}
  </section>;
}
