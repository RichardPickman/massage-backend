import type { NextFunction, Request, Response } from "express";
import ApiError from "../../Error";

export interface ThrottleOptions {
    limit: number;
    windowMs: number;
    message: string;
    // Injected so a spec can move time without sleeping through it.
    now?: () => number;
}

interface Window {
    count: number;
    resetAt: number;
}

// One counter per caller, held in memory. A single process makes that enough,
// and a restart forgetting the counts is better than a lockout nobody can lift.
export const throttle = ({
    limit,
    windowMs,
    message,
    now = Date.now,
}: ThrottleOptions) => {
    const windows = new Map<string, Window>();

    // Windows are only cleared when they are seen again, so a busy server would
    // collect one entry per address forever. Sweeping keeps the map honest.
    const sweep = (time: number) => {
        if (windows.size < 1000) {
            return;
        }

        for (const [key, open] of windows) {
            if (open.resetAt <= time) {
                windows.delete(key);
            }
        }
    };

    return (req: Request, res: Response, next: NextFunction) => {
        const time = now();

        sweep(time);

        const key = req.ip ?? "unknown";
        const open = windows.get(key);

        if (!open || open.resetAt <= time) {
            windows.set(key, { count: 1, resetAt: time + windowMs });

            return next();
        }

        open.count += 1;

        if (open.count > limit) {
            const seconds = Math.ceil((open.resetAt - time) / 1000);

            res.set("Retry-After", String(seconds));

            return next(ApiError.tooManyRequests(message));
        }

        return next();
    };
};
