import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
import "./game-experience.css";
import "./vivid-game.css";
import "./refined-game.css";
import "./arcade.css";
import "./policy-game.css";
import "./experience-v10.css";
export const metadata: Metadata = { title: "COP31 · APECS", description: "Cryosphere Pavilion policy card game." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0c2630" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" data-scroll-behavior="smooth"><body><a className="skip-link" href="#main-content">Skip to content</a><Providers>{children}</Providers></body></html>; }
