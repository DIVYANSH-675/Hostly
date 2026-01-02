"use client";

import { useState, useEffect } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Loader2 } from "lucide-react";

export default function AuthButton({
  user,
}: {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Prefetch home page for faster transition
  useEffect(() => {
    router.prefetch("/");
  }, [router]);

  const handleSignIn = async () => {
    setIsLoading(true);
    const result = await signIn("github", {
      callbackUrl: "/",
      redirect: false,
    });

    if (result?.url) {
      window.location.href = result.url;
    } else {
      // Fallback if something weird happens, though unlikely with standard providers
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    // Use redirect: false for faster sign out call
    await signOut({ redirect: false });
    // Force a hard navigation to ensure clean state and immediate browser feedback
    window.location.href = "/";
  };

  if (!user) {
    return (
      <Button
        onClick={handleSignIn}
        disabled={isLoading}
        className="rounded-full bg-white text-black hover:bg-white/90 min-w-[90px]"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Signing in...</span>
          </div>
        ) : (
          "Sign In"
        )}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-white/80 hidden sm:block">
          {user.name}
        </span>
        <Avatar className="h-8 w-8 border border-white/10">
          <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
          <AvatarFallback>{user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      </div>
      <Button
        variant="ghost"
        onClick={handleSignOut}
        disabled={isLoading}
        className="text-sm text-muted-foreground hover:text-white hover:bg-white/5 min-w-[80px]"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Signing out...</span>
          </div>
        ) : (
          "Sign Out"
        )}
      </Button>
    </div>
  );
}
