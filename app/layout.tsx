import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Polyhedraverse — Build Polyhedra in 3D and 4D";
const description =
  "Snap together over 160 polyhedra in your browser — Platonic, Archimedean, Johnson, Catalan and more — and build real 4D polytopes one cell at a time. Free and open source.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    locale: "en_US",
    images: [{ url: "/brand/icon.png", width: 600, height: 600, alt: "Polyhedraverse" }],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/brand/icon.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
