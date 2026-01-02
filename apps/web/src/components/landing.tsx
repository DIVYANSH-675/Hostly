import Link from "next/link";
import AuthButton from "./auth/auth-button";
import { auth } from "~/server/auth";
import { cn } from "~/lib/utils";
import { HeroSection } from "./landing/hero-section";
import { FeatureGrid } from "./landing/feature-grid";
import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/logo.png"
        alt="Hostly Logo"
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 object-contain"
      />
      <span className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">
        Hostly
      </span>
    </div>
  );
}

export async function Nav() {
  const session = await auth();

  return (
    <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
      <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl shadow-violet-500/10 ring-1 ring-white/5">
        <div className="mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link
                href="/"
                className="flex items-center gap-2 transition-opacity hover:opacity-80"
              >
                <Logo />
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <AuthButton
                user={
                  session?.user
                    ? {
                      name: session.user.name,
                      email: session.user.email,
                      image: session.user.image,
                    }
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export function LandingPage() {
  return (
    <>
      <HeroSection />
      <FeatureGrid />
    </>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-medium text-foreground">
            Developed by Divyansh Gupta
          </p>
          <a
            href="mailto:divyanshgupta0704@gmail.com"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Contact: divyanshgupta0704@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}
