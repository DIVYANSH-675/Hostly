"use client";

import { Button } from "~/components/ui/button";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export function DeployNewProjectButton() {
    const [isLoading, setIsLoading] = useState(false);

    return (
        <Button
            asChild
            className="rounded-full shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-all duration-150"
            onClick={() => setIsLoading(true)}
        >
            <Link href="/?deploy=true" prefetch>
                {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : null}
                Deploy New Project
            </Link>
        </Button>
    );
}
