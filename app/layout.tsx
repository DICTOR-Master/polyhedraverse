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

const SITE = "https://polyhedraverse.vercel.app";
const title = "Polyhedraverse — Build 165 Polyhedra in 3D and Real 4D Polytopes";
const description =
  "Snap together 165 polyhedra face to face in your browser — Platonic, Archimedean, Johnson, Catalan, prisms, parallelohedra and space-filling pairs — and build real 4D polytopes (tesseract, 24-cell, 120-cell, 600-cell) one cell at a time. Free, open source, 7 languages.";
// Structured data for search engines: what the app is and does.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Polyhedraverse",
  url: `${SITE}/`,
  description,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any (web browser)",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  inLanguage: ["en", "ja", "es", "fr", "ko", "zh", "ru"],
  featureList: [
    "165 polyhedra in 11 families: Deltahedra, Platonic, Archimedean, Johnson, Catalan, prisms, antiprisms, 4D-capable seeds, parallelohedra, space-filling pairs and more",
    "Attach shapes face to face or vertex to vertex, with twist, undo and a live name for the assembly",
    "RCP-C2B: build the 5-cell, tesseract, 16-cell, 24-cell, 120-cell and 600-cell one 3D cell at a time",
    "Open and Closed views of each 4D cell, shell colours and the RCP-Coordinates overlay",
    "The 4 Kepler-Poinsot star polyhedra to look at in the full catalogue",
    "Save, export and import builds; User Guide in 7 languages",
  ],
  sameAs: ["https://rhombiverse.vercel.app"],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title,
  description,
  alternates: { canonical: "/" },
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
      <body className="min-h-full flex flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
      </body>
    </html>
  );
}
