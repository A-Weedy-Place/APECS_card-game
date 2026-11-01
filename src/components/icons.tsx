import { Atom, Banknote, BookOpen, Building2, Factory, Filter, Globe2, Handshake, HardHat, HeartHandshake, Home, Leaf, Megaphone, Network, PlugZap, Radar, Scale, Search, ShieldCheck, Ship, Sprout, Sun, TrainFront, Trees, Users, Waves, Wind } from "lucide-react";
const icons = { atom: Atom, bank: Building2, book: BookOpen, factory: Factory, filter: Filter, globe: Globe2, handshake: Handshake, hardhat: HardHat, heart: HeartHandshake, home: Home, leaf: Leaf, megaphone: Megaphone, network: Network, people: Users, plug: PlugZap, radar: Radar, scale: Scale, search: Search, shield: ShieldCheck, ship: Ship, sprout: Sprout, sun: Sun, train: TrainFront, trees: Trees, waves: Waves, wind: Wind, credits: Banknote };
export function PolicyIcon({ name, size = 32 }: { name: string; size?: number }) {
  const Icon = icons[name as keyof typeof icons] ?? Leaf;
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" />;
}
