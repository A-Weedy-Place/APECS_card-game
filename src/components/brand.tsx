import Link from "next/link";
import { MountainSnow, ArrowUpRight } from "lucide-react";
export function Brand() {
  return <Link className="brand" href="/" aria-label="COP31 APECS home"><span className="brand-mark"><MountainSnow size={24} strokeWidth={1.4}/></span><span>COP31<span className="brand-sub">APECS</span></span></Link>;
}
export function Header({ back = false }: { back?: boolean }) {
  return <header className="site-header"><Brand/><nav aria-label="Main navigation"><Link href="/about">How it works</Link><Link className="nav-leader" href="/leaderboard">Live standings <ArrowUpRight size={15}/></Link>{back && <Link href="/">Home</Link>}</nav></header>;
}
