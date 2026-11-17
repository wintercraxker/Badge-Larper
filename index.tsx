/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Kyowa
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import definePlugin from "@utils/types";
import type { ProfileBadge, UserProfile } from "@vencord/discord-types";
import { Menu, showToast, UserProfileStore } from "@webpack/common";

type CustomBadge = ProfileBadge & { title?: string };
type ProfileGetter = typeof UserProfileStore.getUserProfile;

interface ProfileSnapshot {
    sourceProfile: UserProfile;
    signature: string;
    result: UserProfile;
}

const preferences = {
    added: new Map<string, CustomBadge[]>(),
    hidden: new Map<string, Set<string>>(),
};

const runtime = {
    active: false,
    loaded: false,
    revision: 0,
    saves: Promise.resolve(),
    profiles: new Map<string, ProfileSnapshot>(),
    originalGetter: undefined as ProfileGetter | undefined,
    patchedGetter: undefined as ProfileGetter | undefined,
};

function getSignature(userId: string): string {
    const own = preferences.added.get(userId);
    const removed = preferences.hidden.get(userId);
    const ownPart = own ? own.map((b) => b.id).join(",") : "";
    const removedPart = removed ? Array.from(removed).sort().join(",") : "";
    return `${ownPart}|${removedPart}`;
}

function getNitroSinceDate(months: number): string {
    const currentDate = new Date();
    const sinceDate = new Date(currentDate);
    sinceDate.setMonth(currentDate.getMonth() - months);
    const month = sinceDate.getMonth() + 1;
    const day = sinceDate.getDate();
    const year = sinceDate.getFullYear();
    return `${month}/${day}/${year.toString().slice(-2)}`;
}

function getBoostSinceDate(months: number): string {
    const currentDate = new Date();
    const sinceDate = new Date(currentDate);
    sinceDate.setMonth(currentDate.getMonth() - months);
    const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];
    return `${monthNames[sinceDate.getMonth()]} ${sinceDate.getDate()}, ${sinceDate.getFullYear()}`;
}

const availableBadges = [
    {
        id: "staff",
        title: "Discord Staff",
        description: "Discord Staff",
        icon: "5e74e9b61934fc1f67c65515d1f7e60d",
        link: "https://discord.com/company",
    },
    {
        id: "premium",
        title: "Nitro Subscriber",
        description: "Subscriber since Dec 22, 2016",
        icon: "2ba85e8026a8614b640c2837bcdfe21b",
        link: "https://discord.com/settings/premium",
    },
    {
        id: "premium_tenure_1_month_v2",
        title: "Nitro Bronze (1 month)",
        description: `Subscriber since ${getNitroSinceDate(1)}`,
        icon: "4f33c4a9c64ce221936bd256c356f91f",
        link: "https://discord.com/nitro",
    },
    {
        id: "premium_tenure_3_month_v2",
        title: "Nitro Silver (3 months)",
        description: `Subscriber since ${getNitroSinceDate(3)}`,
        icon: "4514fab914bdbfb4ad2fa23df76121a6",
        link: "https://discord.com/nitro",
    },
    {
        id: "premium_tenure_6_month_v2",
        title: "Nitro Gold (6 months)",
        description: `Subscriber since ${getNitroSinceDate(6)}`,
        icon: "2895086c18d5531d499862e41d1155a6",
        link: "https://discord.com/nitro",
    },
    {
        id: "premium_tenure_12_month_v2",
        title: "Nitro Platinum (1 year)",
        description: `Subscriber since ${getNitroSinceDate(12)}`,
        icon: "0334688279c8359120922938dcb1d6f8",
        link: "https://discord.com/nitro",
    },
    {
        id: "premium_tenure_24_month_v2",
        title: "Nitro Diamond (2 years)",
        description: `Subscriber since ${getNitroSinceDate(24)}`,
        icon: "0d61871f72bb9a33a7ae568c1fb4f20a",
        link: "https://discord.com/nitro",
    },
    {
        id: "premium_tenure_36_month_v2",
        title: "Nitro Emerald (3 years)",
        description: `Subscriber since ${getNitroSinceDate(36)}`,
        icon: "11e2d339068b55d3a506cff34d3780f3",
        link: "https://discord.com/nitro",
    },
    {
        id: "premium_tenure_60_month_v2",
        title: "Nitro Ruby (5 years)",
        description: `Subscriber since ${getNitroSinceDate(60)}`,
        icon: "cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4",
        link: "https://discord.com/nitro",
    },
    {
        id: "premium_tenure_72_month_v2",
        title: "Nitro Opal (6+ years)",
        description: `Subscriber since ${getNitroSinceDate(72)}`,
        icon: "5b154df19c53dce2af92c9b61e6be5e2",
        link: "https://discord.com/nitro",
    },
    {
        id: "partner",
        title: "Partnered Server Owner",
        description: "Partnered Server Owner",
        icon: "3f9748e53446a137a052f3454e2de41e",
        link: "https://discord.com/partners",
    },
    {
        id: "certified_moderator",
        title: "Moderator Programs Alumni",
        description: "Moderator Programs Alumni",
        icon: "fee1624003e2fee35cb398e125dc479b",
        link: "https://discord.com/safety",
    },
    {
        id: "hypesquad",
        title: "HypeSquad Events",
        description: "HypeSquad Events",
        icon: "bf01d1073931f921909045f3a39fd264",
        link: "https://discord.com/hypesquad",
    },
    {
        id: "hypesquad_house_1",
        title: "HypeSquad Bravery",
        description: "HypeSquad Bravery",
        icon: "8a88d63823d8a71cd5e390baa45efa02",
        link: "https://discord.com/settings/hypesquad-online",
    },
    {
        id: "hypesquad_house_2",
        title: "HypeSquad Brilliance",
        description: "HypeSquad Brilliance",
        icon: "011940fd013da3f7fb926e4a1cd2e618",
        link: "https://discord.com/settings/hypesquad-online",
    },
    {
        id: "hypesquad_house_3",
        title: "HypeSquad Balance",
        description: "HypeSquad Balance",
        icon: "3aa41de486fa12454c3761e8e223442e",
        link: "https://discord.com/settings/hypesquad-online",
    },
    {
        id: "bug_hunter_level_1",
        title: "Discord Bug Hunter",
        description: "Discord Bug Hunter",
        icon: "2717692c7dca7289b35297368a940dd0",
        link: "https://support.discord.com/hc/en-us/articles/360046057772-Discord-Bugs",
    },
    {
        id: "bug_hunter_level_2",
        title: "Discord Bug Hunter Gold",
        description: "Discord Bug Hunter",
        icon: "848f79194d4be5ff5f81505cbd0ce1e6",
        link: "https://support.discord.com/hc/en-us/articles/360046057772-Discord-Bugs",
    },
    {
        id: "active_developer",
        title: "Active Developer",
        description: "Active Developer",
        icon: "6bdc42827a38498929a4920da12695d9",
        link: "https://support-dev.discord.com/hc/en-us/articles/10113997751447?ref=badge",
    },
    {
        id: "verified_developer",
        title: "Early Verified Bot Developer",
        description: "Early Verified Bot Developer",
        icon: "6df5892e0f35b051f8b61eace34f4967",
        link: "https://discord.com/developers",
    },
    {
        id: "early_supporter",
        title: "Early Supporter",
        description: "Early Supporter",
        icon: "7060786766c9c840eb3019e725d2b358",
        link: "https://discord.com/settings/premium",
    },
    {
        id: "guild_booster_lvl1",
        title: "Server Boost 1 Month",
        description: `Server boosting since ${getBoostSinceDate(1)}`,
        icon: "51040c70d4f20a921ad6674ff86fc95c",
        link: "https://discord.com/settings/premium",
    },
    {
        id: "guild_booster_lvl2",
        title: "Server Boost 2 Months",
        description: `Server boosting since ${getBoostSinceDate(2)}`,
        icon: "0e4080d1d333bc7ad29ef6528b6f2fb7",
        link: "https://discord.com/settings/premium",
    },
    {
        id: "guild_booster_lvl3",
        title: "Server Boost 3 Months",
        description: `Server boosting since ${getBoostSinceDate(3)}`,
        icon: "72bed924410c304dbe3d00a6e593ff59",
        link: "https://discord.com/settings/premium",
    },
    {
        id: "guild_booster_lvl4",
        title: "Server Boost 6 Months",
        description: `Server boosting since ${getBoostSinceDate(6)}`,
        icon: "df199d2050d3ed4ebf84d64ae83989f8",
        link: "https://discord.com/settings/premium",
    },
    {
        id: "guild_booster_lvl5",
        title: "Server Boost 9 Months",
        description: `Server boosting since ${getBoostSinceDate(9)}`,
        icon: "996b3e870e8a22ce519b3a50e6bdd52f",
        link: "https://discord.com/settings/premium",
    },
    {
        id: "guild_booster_lvl6",
        title: "Server Boost 12 Months",
        description: `Server boosting since ${getBoostSinceDate(12)}`,
        icon: "991c9f39ee33d7537d9f408c3e53141e",
        link: "https://discord.com/settings/premium",
    },
    {
        id: "guild_booster_lvl7",
        title: "Server Boost 15 Months",
        description: `Server boosting since ${getBoostSinceDate(15)}`,
        icon: "cb3ae83c15e970e8f3d410bc62cb8b99",
        link: "https://discord.com/settings/premium",
    },
    {
        id: "guild_booster_lvl8",
        title: "Server Boost 18 Months",
        description: `Server boosting since ${getBoostSinceDate(18)}`,
        icon: "7142225d31238f6387d9f09efaa02759",
        link: "https://discord.com/settings/premium",
    },
    {
        id: "guild_booster_lvl9",
        title: "Server Boost 24 Months",
        description: `Server boosting since ${getBoostSinceDate(24)}`,
        icon: "ec92202290b48d0879b7413d2dde3bab",
        link: "https://discord.com/settings/premium",
    },
    {
        id: "legacy_username",
        title: "Legacy Username",
        description: "Originally known as their old username",
        icon: "6de6d34650760ba5551a79732e98ed60",
        link: "https://discord.com",
    },
    {
        id: "quest_completed",
        title: "Quest Completer",
        description: "Completed a Quest",
        icon: "7d9ae358c8c5e118768335dbe68b4fb8",
        link: "https://discord.com/settings/inventory",
    },
    {
        id: "bot_commands",
        title: "Supports Commands",
        description: "Supports Commands",
        icon: "6f9e37f9029ff57aef81db857890005e",
        link: "https://discord.com/blog/welcome-to-the-new-era-of-discord-apps?ref=badge",
    },
    {
        id: "automod",
        title: "Uses AutoMod",
        description: "Uses automod",
        icon: "f2459b691ac7453ed6039bbcfaccbfcd",
        link: "https://discord.com",
    },
    {
        id: "application_guild_subscription",
        title: "Server Subscription",
        description: "Monetized server",
        icon: "d2010c413a8da2208b7e4311042a4b9d",
        link: "https://discord.com",
    },
    {
        id: "orb_profile_badge",
        title: "Orbs",
        description: "Collected the Orb Profile Badge",
        icon: "83d8a1eb09a8d64e59233eec5d4d5c2d",
        link: "https://discord.com",
    },
];

async function loadData(run: number) {
    await runtime.saves;
    const [savedUserBadges, savedRemovedBadges] = await DataStore.getMany<unknown>([
        "userBadges",
        "removedBadges",
    ]);
    if (!runtime.active || run !== runtime.revision) return;
    const isRecord = (value: unknown): value is Record<string, unknown> =>
        !!value && typeof value === "object" && !Array.isArray(value);
    if (savedUserBadges !== undefined && !isRecord(savedUserBadges))
        throw new Error("Invalid saved badges");
    if (savedRemovedBadges !== undefined && !isRecord(savedRemovedBadges))
        throw new Error("Invalid saved hidden badges");
    preferences.added.clear();
    preferences.hidden.clear();
    runtime.profiles.clear();
    if (savedUserBadges) {
        Object.entries(savedUserBadges).forEach(([userId, badges]) => {
            if (
                !Array.isArray(badges) ||
                badges.some(
                    (b) =>
                        !isRecord(b) ||
                        typeof b.id !== "string" ||
                        typeof b.icon !== "string" ||
                        typeof b.description !== "string" ||
                        (b.link !== undefined && typeof b.link !== "string"),
                )
            ) {
                throw new Error("Invalid saved badge entry");
            }
            const updatedBadges = (badges as CustomBadge[]).map((badge) => {
                const freshBadge = availableBadges.find((b) => b.id === badge.id);
                if (
                    freshBadge &&
                    (badge.id.startsWith("premium_tenure_") ||
                        badge.id.startsWith("guild_booster_"))
                ) {
                    return { ...badge, description: freshBadge.description };
                }
                return badge;
            });
            preferences.added.set(userId, updatedBadges);
        });
    }

    if (savedRemovedBadges) {
        Object.entries(savedRemovedBadges).forEach(([userId, badgeIds]) => {
            if (!Array.isArray(badgeIds) || badgeIds.some((id) => typeof id !== "string"))
                throw new Error("Invalid saved hidden badge entry");
            preferences.hidden.set(userId, new Set(badgeIds));
        });
    }
}

function saveData() {
    const userBadgesObject = Object.fromEntries(
        Array.from(preferences.added, ([id, badges]) => [
            id,
            badges.map((badge) => ({ ...badge })),
        ]),
    );

    const removedBadgesObject = Object.fromEntries(
        Array.from(preferences.hidden.entries()).map(([userId, badgeIds]) => [
            userId,
            Array.from(badgeIds),
        ]),
    );
    runtime.saves = runtime.saves
        .then(() =>
            DataStore.setMany([
                ["userBadges", userBadgesObject],
                ["removedBadges", removedBadgesObject],
            ]),
        )
        .catch((err) => {
            console.error("[Badge Larper] failed to save badge preferences", err);
            showToast({ text: "Could not save badge preferences", variant: "critical" });
        });
    return runtime.saves;
}

function invalidateCache(userId: string) {
    runtime.profiles.delete(userId);
}

function invalidateProfiles() {
    runtime.profiles.clear();
}

function notifyProfileChanged(userId?: string) {
    if (userId) invalidateCache(userId);
    else invalidateProfiles();
    try {
        UserProfileStore.emitChange();
    } catch (err) {
        console.error("[Badge Larper] failed to emit UserProfileStore change", err);
    }
}

function addBadgesToUser(userId: string, badges: CustomBadge[]) {
    const existingBadges = preferences.added.get(userId) || [];
    badges.forEach((badge) => {
        const existingIndex = existingBadges.findIndex((b) => b.id === badge.id);
        if (existingIndex === -1) {
            existingBadges.push(badge);
        }
    });
    preferences.added.set(userId, existingBadges);
    notifyProfileChanged(userId);
    saveData();
}

function removeBadgeFromUser(userId: string, badgeId: string) {
    const existingBadges = preferences.added.get(userId) || [];
    const updatedBadges = existingBadges.filter((b) => b.id !== badgeId);
    if (updatedBadges.length > 0) {
        preferences.added.set(userId, updatedBadges);
    } else {
        preferences.added.delete(userId);
    }
    notifyProfileChanged(userId);
    saveData();
}

function getUserBadges(userId: string): CustomBadge[] {
    return preferences.added.get(userId) || [];
}

function hideRealBadge(userId: string, badgeId: string) {
    if (!preferences.hidden.has(userId)) {
        preferences.hidden.set(userId, new Set());
    }
    preferences.hidden.get(userId)!.add(badgeId);
    notifyProfileChanged(userId);
    saveData();
}

function unhideRealBadge(userId: string, badgeId: string) {
    if (preferences.hidden.has(userId)) {
        preferences.hidden.get(userId)!.delete(badgeId);
        if (preferences.hidden.get(userId)!.size === 0) {
            preferences.hidden.delete(userId);
        }
        notifyProfileChanged(userId);
        saveData();
    }
}

function isRealBadgeHidden(userId: string, badgeId: string): boolean {
    return preferences.hidden.has(userId) && preferences.hidden.get(userId)!.has(badgeId);
}

function toggleBadge(
    userId: string,
    badge: (typeof availableBadges)[number],
    hasActualBadge: boolean,
) {
    const hasUserBadge = getUserBadges(userId).find((b) => b.id === badge.id);
    const isHidden = isRealBadgeHidden(userId, badge.id);

    if (hasActualBadge) {
        if (isHidden && !hasUserBadge) {
            unhideRealBadge(userId, badge.id);
            showToast({ text: `Restored ${badge.title}`, variant: "success" });
        } else {
            const remaining = getUserBadges(userId).filter((b) => b.id !== badge.id);
            if (remaining.length) preferences.added.set(userId, remaining);
            else preferences.added.delete(userId);
            hideRealBadge(userId, badge.id);
            showToast({ text: `Removed ${badge.title}`, variant: "success" });
        }
    } else {
        if (hasUserBadge) {
            removeBadgeFromUser(userId, badge.id);
            showToast({ text: `Removed ${badge.title}`, variant: "success" });
        } else {
            addBadgesToUser(userId, [badge]);
            showToast({ text: `Added ${badge.title}`, variant: "success" });
        }
    }
}

function giveAllBadges(userId: string) {
    const hiddenBadges = preferences.hidden.get(userId);
    if (hiddenBadges) {
        for (const badge of availableBadges) hiddenBadges.delete(badge.id);
        if (!hiddenBadges.size) preferences.hidden.delete(userId);
    }
    addBadgesToUser(userId, availableBadges);
    showToast({ text: "Added all badges", variant: "success" });
}

export default definePlugin({
    name: "Badge Larper",
    description:
        "Add, remove, and customize Discord profile badges locally. All changes are purely visual.",
    authors: [{ id: 1204265766128455781n, name: "Kyowa" }],

    start() {
        if (runtime.active) return;
        runtime.active = true;
        const run = ++runtime.revision;
        void loadData(run)
            .then(() => {
                if (!runtime.active || run !== runtime.revision) return;
                const getUserProfile = (runtime.originalGetter = UserProfileStore.getUserProfile);
                if (typeof getUserProfile !== "function")
                    throw new Error("UserProfileStore.getUserProfile is unavailable");
                runtime.patchedGetter = function (
                    this: typeof UserProfileStore,
                    ...args: Parameters<ProfileGetter>
                ) {
                    const userId = args[0];
                    const userProfile = getUserProfile.apply(this, args);
                    if (!runtime.active || run !== runtime.revision) return userProfile;
                    if (!userProfile) return userProfile;

                    const hasCustomizations =
                        preferences.added.has(userId) || preferences.hidden.has(userId);
                    if (!hasCustomizations) return userProfile;

                    try {
                        const signature = getSignature(userId);
                        const cached = runtime.profiles.get(userId);

                        if (
                            cached &&
                            cached.sourceProfile === userProfile &&
                            cached.signature === signature
                        ) {
                            return cached.result;
                        }

                        let newBadges = Array.isArray(userProfile.badges)
                            ? Array.from(userProfile.badges)
                            : [];

                        if (preferences.hidden.has(userId)) {
                            const hiddenBadges = preferences.hidden.get(userId)!;
                            newBadges = newBadges.filter((b) => !hiddenBadges.has(b.id));
                        }

                        if (preferences.added.has(userId)) {
                            const userBadges = preferences.added.get(userId)!;
                            userBadges.forEach((badgeObj) => {
                                const { id, description, icon, link } = badgeObj;
                                if (!id || !icon) return;
                                const badgeIndex = newBadges.findIndex((b) => b.id === id);
                                if (badgeIndex === -1) {
                                    newBadges.push({ id, description, icon, link });
                                }
                            });
                        }

                        newBadges.sort((a, b) => {
                            const orderA = availableBadges.findIndex((badge) => badge.id === a.id);
                            const orderB = availableBadges.findIndex((badge) => badge.id === b.id);
                            const finalOrderA = orderA === -1 ? 9999 : orderA;
                            const finalOrderB = orderB === -1 ? 9999 : orderB;
                            return finalOrderA - finalOrderB;
                        });

                        const result: UserProfile = Object.create(
                            Object.getPrototypeOf(userProfile),
                            {
                                ...Object.getOwnPropertyDescriptors(userProfile),
                                badges: {
                                    value: newBadges,
                                    enumerable: true,
                                    writable: true,
                                    configurable: true,
                                },
                            },
                        );
                        runtime.profiles.set(userId, {
                            sourceProfile: userProfile,
                            signature,
                            result,
                        });
                        return result;
                    } catch (err) {
                        console.error(
                            "[Badge Larper] failed to build custom badge list, falling back to original",
                            err,
                        );
                        return userProfile;
                    }
                };
                UserProfileStore.getUserProfile = runtime.patchedGetter;
                UserProfileStore.addChangeListener(invalidateProfiles);
                runtime.loaded = true;
                notifyProfileChanged();
            })
            .catch((err) => {
                if (!runtime.active || run !== runtime.revision) return;
                console.error("[Badge Larper] failed to load badge preferences", err);
                this.stop();
                showToast({ text: "Could not load badge preferences", variant: "critical" });
            });
    },

    stop() {
        runtime.active = false;
        runtime.loaded = false;
        runtime.revision++;
        if (runtime.patchedGetter) UserProfileStore.removeChangeListener(invalidateProfiles);
        if (runtime.originalGetter && UserProfileStore.getUserProfile === runtime.patchedGetter) {
            UserProfileStore.getUserProfile = runtime.originalGetter;
        }
        preferences.added.clear();
        preferences.hidden.clear();
        runtime.profiles.clear();
        runtime.originalGetter = undefined;
        runtime.patchedGetter = undefined;
        notifyProfileChanged();
    },

    contextMenus: {
        "user-context"(children, { user }) {
            if (!user || !runtime.active || !runtime.loaded) return;

            const currentUserBadges = getUserBadges(user.id);
            const userProfile = runtime.originalGetter
                ? runtime.originalGetter.call(UserProfileStore, user.id)
                : UserProfileStore.getUserProfile(user.id);
            const actualBadges = Array.isArray(userProfile?.badges) ? userProfile.badges : [];

            children.push(
                <Menu.MenuItem
                    label="Manage Badges"
                    key="custom-badges"
                    id="user-context-custom-badges"
                >
                    {availableBadges.map((badge) => {
                        const hasUserBadge = currentUserBadges.find((b) => b.id === badge.id);
                        const hasActualBadge = actualBadges.find((b) => b.id === badge.id);
                        const isHidden = isRealBadgeHidden(user.id, badge.id);
                        const isChecked = !!hasUserBadge || (!!hasActualBadge && !isHidden);

                        return (
                            <Menu.MenuCheckboxItem
                                key={badge.id}
                                id={`badge-${badge.id}`}
                                label={badge.title}
                                leadingAccessory={{
                                    type: "image",
                                    src: `https://cdn.discordapp.com/badge-icons/${badge.icon}.png`,
                                }}
                                checked={isChecked}
                                action={() => toggleBadge(user.id, badge, !!hasActualBadge)}
                            />
                        );
                    })}
                    <Menu.MenuSeparator />
                    <Menu.MenuItem
                        label="Give All Badges"
                        id="give-all-badges"
                        color="brand"
                        action={() => giveAllBadges(user.id)}
                    />
                    <Menu.MenuItem
                        label="Remove All Badges"
                        id="remove-all-badges"
                        color="danger"
                        action={() => {
                            preferences.hidden.set(
                                user.id,
                                new Set([
                                    ...(preferences.hidden.get(user.id) ?? []),
                                    ...actualBadges.map((badge) => badge.id),
                                ]),
                            );
                            preferences.added.delete(user.id);
                            notifyProfileChanged(user.id);
                            saveData();

                            showToast({ text: "Removed all badges", variant: "success" });
                        }}
                    />
                    <Menu.MenuItem
                        label="Reset to Original"
                        id="reset-badges"
                        color="default"
                        action={() => {
                            preferences.added.delete(user.id);
                            preferences.hidden.delete(user.id);
                            notifyProfileChanged(user.id);
                            saveData();

                            showToast({
                                text: "Reset badges to original state",
                                variant: "success",
                            });
                        }}
                    />
                </Menu.MenuItem>,
            );
        },
    },
});
