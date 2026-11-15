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
//   title: "Extraordinary Circumstances",
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
 title: "Extraordinary Circumstances | Smarter multimodal travel",
 description: "Travel Smarter, not Harder",
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
 return (
  <html lang="en" suppressHydrationWarning>
    <head>
      {/* Apply the saved theme before the page paints, so there is no light flash in dark mode. */}
      <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("expected-circumstances-theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";document.documentElement.style.colorScheme=d?"dark":"light"}catch(e){}` }} />
    </head>
    <body>{children}</body>
  </html>
);
}
