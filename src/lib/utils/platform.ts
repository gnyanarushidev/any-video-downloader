export type Platform = "youtube" | "facebook" | "instagram" | "twitter" | "linkedin" | "unknown";

export function detectPlatform(url: string): Platform {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "").toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("facebook.com") || host.includes("fb.watch")) return "facebook";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("twitter.com") || host.includes("x.com")) return "twitter";
    if (host.includes("linkedin.com")) return "linkedin";
    return "unknown";
  } catch {
    return "unknown";
  }
}