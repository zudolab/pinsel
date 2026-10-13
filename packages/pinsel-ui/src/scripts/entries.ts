/** ZFB client-script entry names (`apps/site/src/<name>.client.ts`) in load order for `clientScript(name)`. */
export const VISITOR_SCRIPT_NAMES = ["art-clock", "motion", "site"] as const;
export type VisitorScriptName = (typeof VISITOR_SCRIPT_NAMES)[number];
