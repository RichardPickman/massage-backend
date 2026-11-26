/**
 * The refusals that keep an admin panel from locking the site out of itself.
 *
 * Kept pure and separate from the controller so the rules can be tested as rules:
 * every branch here is a decision someone will want to argue about later, and an
 * argument is cheaper against a function than against a running server.
 */

export type GuardResult =
    | { allowed: true }
    | { allowed: false; code: string; message: string };

const allowed: GuardResult = { allowed: true };

export type ChangeInput = {
    actorId: string;
    targetId: string;
    targetRole: string;
    // The role the caller wants to set; absent means "not changing it".
    nextRole?: string;
    // How many admins exist right now.
    admins: number;
};

export const guardChange = ({
    actorId,
    targetId,
    targetRole,
    nextRole,
    admins,
}: ChangeInput): GuardResult => {
    const isSelf = actorId === targetId;
    const demoting = targetRole === "admin" && nextRole !== undefined && nextRole !== "admin";

    if (isSelf && demoting) {
        return {
            allowed: false,
            code: "admin.cannotDemoteSelf",
            message: "You cannot take the admin role away from yourself",
        };
    }

    // Only checked when the change would actually remove an admin: editing a
    // nickname on the last admin is fine, and so is promoting someone.
    if (demoting && admins <= 1) {
        return {
            allowed: false,
            code: "admin.lastAdmin",
            message: "The site needs at least one admin",
        };
    }

    return allowed;
};

export type RemoveInput = {
    actorId: string;
    targetId: string;
    targetRole: string;
    admins: number;
};

export const guardRemoval = ({
    actorId,
    targetId,
    targetRole,
    admins,
}: RemoveInput): GuardResult => {
    if (actorId === targetId) {
        return {
            allowed: false,
            code: "admin.cannotRemoveSelf",
            message: "You cannot remove your own account from here",
        };
    }

    if (targetRole === "admin" && admins <= 1) {
        return {
            allowed: false,
            code: "admin.lastAdmin",
            message: "The site needs at least one admin",
        };
    }

    return allowed;
};
