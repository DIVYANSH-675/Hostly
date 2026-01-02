import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "~/components/theme-provider";

import { Toaster } from "~/components/ui/sonner";

export const metadata: Metadata = {
  title: "Hostly",
  description: "Your incomplete platform for the web.",
  icons: [{ rel: "icon", url: "/logo.png" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable}`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-screen flex-col bg-background"
        suppressHydrationWarning
      >
        <TRPCReactProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
          >
            <main className="flex-1">{children}</main>
            <Toaster />
          </ThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
