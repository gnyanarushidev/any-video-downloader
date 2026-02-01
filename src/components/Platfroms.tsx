"use client";

import Link from "next/link";
import { JSX } from "react";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa";

type Platform = {
  id: string;
  name: string;
  icon: JSX.Element;
  bg: string;
};

const PLATFORMS: Platform[] = [
  {
    id: "youtube",
    name: "YouTube",
    icon: <FaYoutube size={28} />,
    bg: "bg-red-600",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: <FaInstagram size={28} />,
    bg: "bg-gradient-to-br from-pink-500 to-purple-600",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: <FaFacebook size={28} />,
    bg: "bg-blue-600",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: <FaLinkedin size={28} />,
    bg: "bg-blue-700",
  },
  {
    id: "twitter",
    name: "Twitter",
    icon: <FaTwitter size={28} />,
    bg: "bg-sky-500",
  },
];

export default function Platforms() {
  return (
    <section className="flex flex-wrap justify-center gap-6">
      {PLATFORMS.map((platform, index) => (
        <Link
          key={platform.id}
          href={`/${platform.id}`}
          aria-label={`Go to ${platform.name} downloader page`}
          className={`platform-tile flex h-16 w-16 items-center justify-center rounded-xl text-white shadow-lg ${platform.bg}`}
          style={{ animationDelay: `${index * 0.12}s` }}>
          {platform.icon}
        </Link>
      ))}
    </section>
  );
}
