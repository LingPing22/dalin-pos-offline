"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readSession } from "@/lib/session";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(readSession() ? "/pos/" : "/login/");
  }, [router]);
  return null;
}
