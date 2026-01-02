"use client";

import { useEffect, useState } from "react";

export function ClientDate({ date }: { date: Date | string }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <span className="animate-pulse bg-muted text-transparent rounded">Loading...</span>;
    }

    return <>{new Date(date).toLocaleString()}</>;
}
