// import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
// import "./globals.css";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// export const metadata = {
//   title: "Expected Circumstances",
//   description: "Find smarter, cheaper ways to travel.",
// };

// export default function RootLayout({ children }: LayoutProps<"/">) {
//   return (
//     <html
//       lang="en"
//       className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
//     >
//       <body className="min-h-full flex flex-col">{children}</body>
//     </html>
//   );
// }
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
 title: "Expected Circumstances | Smarter multimodal travel",
 description: "Travel Smarter, not Harder",
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
 return <html lang="en" suppressHydrationWarning>
  <head>
    <script dangerouslySetInnerHTML={{ __html: `try { const choice = localStorage.getItem('expected-circumstances-theme'); if (choice === 'light' || choice === 'dark') { document.documentElement.setAttribute('data-theme', choice); } } catch (_) {}` }} />
  </head>
  <body>{children}</body>
 </html>;
}
