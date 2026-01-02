"use client";

import { Button } from "~/components/ui/button";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface DeployButtonProps {
    owner: string;
    repo: string;
}

export function DeployButton({ owner, repo }: DeployButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    return (
        <Button
            variant="default"
            size="sm"
            asChild
            className="bg-white/10 hover:bg-white/20 text-white border-none min-w-[72px]"
            onClick={() => setIsLoading(true)}
        >
            <Link href={`/deploy/?owner=${owner}&repo=${repo}`} prefetch>
                {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Deploy"}
            </Link>
        </Button>
    );
}
