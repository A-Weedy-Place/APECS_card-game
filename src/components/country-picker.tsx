"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export function Flag({ code, className = "" }: { code: string; className?: string }) {
  return <img src={`/flags/${code.toLowerCase()}.svg`} alt="" className={`country-flag ${className}`} width="28" height="21" loading="lazy" decoding="async"/>;
}
export function CountryPicker({ countries, value, onChange }: { countries: { code: string; name: string }[]; value: string; onChange: (value: string) => void }) {
  const id = useId(), popup = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), search = useRef<HTMLInputElement>(null), list = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(""), [open, setOpen] = useState(false), [placement, setPlacement] = useState({ left: 0, top: 0, width: 300, maxHeight: 280 });
  const name = countries.find(c => c.code === value)?.name;
  const choices = countries.filter(country => `${country.name} ${country.code}`.toLowerCase().includes(query.toLowerCase()));
  const hide = () => { if (typeof popup.current?.hidePopover === "function") popup.current.hidePopover(); setOpen(false); };
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!popup.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) hide(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); hide(); trigger.current?.focus(); } };
    const blur = (event: FocusEvent) => { if (!popup.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) hide(); };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape); document.addEventListener("focusin", blur);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); document.removeEventListener("focusin", blur); };
  }, [open]);
  function show() {
    const rect = trigger.current!.getBoundingClientRect(), height = Math.min(280, window.innerHeight - 24);
    setPlacement({ left: Math.max(12, Math.min(rect.left, window.innerWidth - rect.width - 12)), top: rect.bottom + height + 8 <= window.innerHeight ? rect.bottom + 6 : Math.max(12, rect.top - height - 6), width: Math.min(rect.width, window.innerWidth - 24), maxHeight: height });
    setQuery(""); setOpen(true); if (typeof popup.current?.showPopover === "function") popup.current.showPopover(); requestAnimationFrame(() => search.current?.focus());
  }
  return <>
    <input type="hidden" name="country" value={value}/>
    <button type="button" id="country" ref={trigger} className="country-trigger" aria-haspopup="listbox" aria-controls={id} aria-expanded={open} aria-label={`Country: ${name ?? "Select"}`} onClick={() => open ? hide() : show()}>{value && <Flag code={value}/>}<span>{name ?? "Select country"}</span><ChevronDown size={18} aria-hidden="true"/></button>
    <div className="country-dropdown" id={id} ref={popup} popover="auto" style={{ ...placement, display: open ? "flex" : "none" }} onToggle={event => setOpen(event.newState === "open")}>
      <label className="country-search"><Search size={16} aria-hidden="true"/><input ref={search} aria-label="Search countries" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find country" onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); list.current?.querySelector<HTMLButtonElement>("[role=option]")?.focus(); } }}/></label>
      <div className="country-options" ref={list} role="listbox" aria-label="Countries" onKeyDown={event => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const options = [...(list.current?.querySelectorAll<HTMLButtonElement>("[role=option]") ?? [])];
        const index = options.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : Math.max(0, Math.min(options.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
        options[next]?.focus();
      }}>{choices.map((country, index) => <button key={country.code} type="button" role="option" tabIndex={index === 0 || country.code === value ? 0 : -1} aria-selected={country.code === value} onClick={() => { onChange(country.code); hide(); trigger.current?.focus(); }}><Flag code={country.code}/><span>{country.name}</span></button>)}{!choices.length && <p>No matching countries</p>}</div>
    </div>
  </>;
}
