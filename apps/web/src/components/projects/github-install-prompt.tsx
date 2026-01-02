"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Github, ExternalLink } from "lucide-react";
import { api } from "~/trpc/react";

interface GitHubInstallPromptProps {
    installUrl: string;
}

type StatusState = {
    kind: "info" | "error";
    message: string;
    details?: string;
};

export function GitHubInstallPrompt({
    installUrl,
}: GitHubInstallPromptProps) {
    const router = useRouter();
    const [status, setStatus] = useState<StatusState | null>(null);
    const installStatusQuery = api.github.getInstallationStatus.useQuery(undefined, {
        enabled: false,
    });

    const handleVerify = async () => {
        setStatus(null);
        const result = await installStatusQuery.refetch();

        if (result.data?.installed) {
            router.refresh();
            return;
        }

        if (result.data?.error) {
            setStatus({
                kind: "error",
                message: result.data.error.message,
                details:
                    result.data.error.details &&
                        result.data.error.details !== result.data.error.message
                        ? result.data.error.details
                        : undefined,
            });
            return;
        }

        if (result.error) {
            setStatus({
                kind: "error",
                message: result.error.message || "Failed to verify GitHub installation.",
            });
            return;
        }

        setStatus({
            kind: "info",
            message:
                "We could not find an installation yet. If you just installed it, wait a few seconds and try again.",
        });
    };

    return (
        <Card className="mx-auto max-w-md">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Github className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Connect Your GitHub Account</CardTitle>
                <CardDescription>
                    To deploy your repositories, you need to install the Hostly GitHub App on your account.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                <p className="text-center text-sm text-muted-foreground">
                    This allows Hostly to access your repositories and receive notifications when you push new code.
                </p>
                <Button asChild className="w-full">
                    <a href={installUrl} target="_blank" rel="noopener noreferrer">
                        <Github className="mr-2 h-4 w-4" />
                        Install GitHub App
                        <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                </Button>
                <Button
                    variant="ghost"
                    onClick={handleVerify}
                    disabled={installStatusQuery.isFetching}
                    className="min-w-[180px]"
                >
                    {installStatusQuery.isFetching ? (
                        <>
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Checking...
                        </>
                    ) : (
                        "I've already installed it"
                    )}
                </Button>
                {status ? (
                    <div
                        className={[
                            "w-full rounded-lg border px-3 py-2 text-sm",
                            status.kind === "error"
                                ? "border-red-500/20 bg-red-500/10 text-red-200"
                                : "border-amber-500/20 bg-amber-500/10 text-amber-200",
                        ].join(" ")}
                    >
                        <p>{status.message}</p>
                        {status.details ? (
                            <p className="mt-1 text-xs text-red-200/80">{status.details}</p>
                        ) : null}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
