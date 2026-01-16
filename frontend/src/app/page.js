"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Перенаправляем на главную страницу
    router.push("/home");
  }, [router]);

  return null;
}
