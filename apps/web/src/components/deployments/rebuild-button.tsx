"use client";

import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

interface RebuildButtonProps {
    siteId: string;
}

export function RebuildButton({ siteId }: RebuildButtonProps) {
    const [isRebuilding, setIsRebuilding] = useState(false);
    const utils = api.useUtils();

    const rebuildMutation = api.sites.rebuild.useMutation({
        onMutate: () => {
            setIsRebuilding(true);
        },
        onSuccess: () => {
            // Invalidate the site query to refresh deployments
            utils.sites.get.invalidate({ id: siteId });
            setIsRebuilding(false);
        },
        onError: (error) => {
            console.error("Rebuild failed:", error);
            setIsRebuilding(false);
        },
    });

    const handleRebuild = () => {
        rebuildMutation.mutate({ siteId });
    };

    return (
        <Button
            onClick={handleRebuild}
            disabled={isRebuilding}
            className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white"
        >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRebuilding ? "animate-spin" : ""}`} />
            {isRebuilding ? "Rebuilding..." : "Rebuild"}
        </Button>
    );
}
