import { ComponentPropsWithoutRef } from "react";
import { cn } from "~/lib/utils";
import { Globe, GitBranch, History, Lock, Zap, Server } from "lucide-react";

const features = [
    {
        name: "Global Edge Network",
        description:
            "Your content is automatically distributed to over 35 regions worldwide, ensuring low latency for every user.",
        icon: Globe,
        className: "col-span-3 lg:col-span-2",
    },
    {
        name: "GitHub Integration",
        description: "Every push to main deploys a new version. Preview pull requests automatically before merging.",
        icon: GitBranch,
        className: "col-span-3 lg:col-span-1",
    },
    {
        name: "Instant Rollbacks",
        description: "Mistake? No problem. Revert to any previous deployment instantly with a single click.",
        icon: History,
        className: "col-span-3 lg:col-span-1",
    },
    {
        name: "Blazing Fast Builds",
        description: "Optimized build pipeline that compiles your code in seconds. Ship updates faster than ever.",
        icon: Zap,
        className: "col-span-3 lg:col-span-2",
    },
];

function FeatureCard({
    feature,
    className,
}: {
    feature: (typeof features)[0];
    className?: string;
}) {
    return (
        <div className={cn(
            "relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 transition-colors hover:bg-white/10",
            feature.className,
            className
        )}>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">{feature.name}</h3>
            <p className="text-muted-foreground">{feature.description}</p>

            {/* Decorative gradient blob */}
            <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 blur-2xl" />
        </div>
    );
}

export function FeatureGrid() {
    return (
        <section className="py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center mb-16">
                    <h2 className="text-base font-semibold leading-7 text-primary">Deploy faster</h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        Everything you need to ship to the web
                    </p>
                    <p className="mt-6 text-lg leading-8 text-muted-foreground">
                        Hostly handles the complexity of cloud infrastructure so you can focus on building your product.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                    {features.map((feature) => (
                        <FeatureCard key={feature.name} feature={feature} />
                    ))}
                </div>
            </div>
        </section>
    );
}
