"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { LoaderCircle, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "~/components/ui/alert-dialog";

interface DeleteProjectButtonProps {
    siteId: string;
    siteName: string;
}

export function DeleteProjectButton({ siteId, siteName }: DeleteProjectButtonProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const deleteMutation = api.sites.delete.useMutation({
        onSuccess: () => {
            toast.success("Project deleted successfully");
            router.push("/");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete project");
        },
    });

    const handleDelete = () => {
        deleteMutation.mutate({ siteId });
    };

    // Prefetch dashboard for instant redirect
    useEffect(() => {
        router.prefetch("/");
    }, [router]);

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="destructive"
                    className="bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Project
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-zinc-900 border border-white/10">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-red-400">
                        <AlertTriangle className="h-5 w-5" />
                        Delete Project
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="text-muted-foreground text-sm">
                            <p>
                                Are you sure you want to delete <strong className="text-white">{siteName}</strong>?
                            </p>
                            <p className="mt-3">This will permanently:</p>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>Delete all deployments</li>
                                <li>Remove all files from storage</li>
                                <li>Remove all subdomains</li>
                            </ul>
                            <p className="text-red-400 font-medium mt-3">This action cannot be undone.</p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="bg-red-500 hover:bg-red-600 text-white"
                    >
                        {deleteMutation.isPending ? (
                            <>
                                <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                                Deleting...
                            </>
                        ) : (
                            "Delete Project"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
