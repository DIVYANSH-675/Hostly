"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "~/components/ui/button";
import { signIn } from "next-auth/react";
import { Terminal, Loader2 } from "lucide-react";

function TerminalContent() {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (step < 12) {
                setStep(step + 1);
            }
        }, step === 0 ? 1000 : step === 8 ? 1500 : 400);

        return () => clearTimeout(timeout);
    }, [step]);

    return (
        <div className="p-6 font-mono text-sm text-zinc-300 space-y-2 min-h-[400px]">
            <div className="flex">
                <span className="text-violet-500 mr-2">➜</span>
                <span className="text-cyan-500 mr-2">~/my-project</span>
                <span className="text-zinc-500">git push hostly main</span>
            </div>

            {step >= 1 && <div className="text-zinc-500 pt-2 fade-in">Enumerating objects: 15, done.</div>}
            {step >= 2 && <div className="text-zinc-500 fade-in">Counting objects: 100% (15/15), done.</div>}
            {step >= 3 && <div className="text-zinc-500 fade-in">Delta compression using up to 12 threads.</div>}
            {step >= 4 && <div className="text-zinc-500 fade-in">Compressing objects: 100% (12/12), done.</div>}
            {step >= 5 && <div className="text-zinc-500 fade-in">Writing objects: 100% (15/15), 2.34 KiB | 2.34 MiB/s, done.</div>}
            {step >= 6 && <div className="text-zinc-500 fade-in">Total 15 (delta 3), reused 0 (delta 0), pack-reused 0</div>}

            {step >= 7 && <div className="text-emerald-500 pt-2 fade-in">remote: Building...</div>}
            {step >= 8 && <div className="text-emerald-500 fade-in">remote: [1/3] Cloning repository...</div>}
            {step >= 9 && <div className="text-emerald-500 fade-in">remote: [2/3] Installing dependencies...</div>}
            {step >= 10 && <div className="text-emerald-500 fade-in">remote: [3/3] Building production bundle...</div>}

            {step >= 11 && <div className="text-emerald-400 font-bold pt-2 fade-in">remote: Deployment complete! 🚀</div>}
            {step >= 12 && <div className="text-zinc-500 fade-in">To https://git.hostly.dev/divyansh/my-project.git</div>}
        </div>
    );
}

export function HeroSection() {
    const [isLoading, setIsLoading] = useState(false);

    const handleSignIn = async () => {
        setIsLoading(true);
        const result = await signIn("github", {
            callbackUrl: "/",
            redirect: false,
        });

        if (result?.url) {
            window.location.href = result.url;
        } else {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative isolate overflow-hidden bg-background pt-14">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

            <div className="py-24 sm:py-32 lg:pb-40">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-4xl text-center">
                        <h1 className="mt-20 text-4xl font-bold tracking-tight text-foreground sm:text-6xl text-balance bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
                            Deploy your static sites
                            <br />
                            <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">in seconds.</span>
                        </h1>

                        <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
                            Hostly provides the developer tools and cloud infrastructure to build, scale, and secure your web applications. Push to GitHub, and we handle the rest.
                        </p>

                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Button
                                size="lg"
                                onClick={handleSignIn}
                                disabled={isLoading}
                                className="h-12 px-8 text-lg rounded-full shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all min-w-[180px]"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    "Start Deploying"
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Terminal Mockup */}
                    <div className="mt-16 flow-root sm:mt-24">
                        <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 dark:bg-white/5 dark:ring-white/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                            <div className="rounded-md bg-zinc-950 shadow-2xl border border-white/5 overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono ml-2 flex items-center gap-2">
                                        <Image src="/logo.png" alt="Hostly" width={24} height={24} className="w-6 h-6 object-contain" />
                                        <span>Hostly</span>
                                    </div>
                                </div>
                                <TerminalContent />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Background Gradients */}
            <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 pointer-events-none" aria-hidden="true">
                <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}></div>
            </div>
        </div>
    );
}
