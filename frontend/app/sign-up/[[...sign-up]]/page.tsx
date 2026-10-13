"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "../../../components/AuthCard";

export default function SignUpPage() {
  const router = useRouter();

  return (
    <div className="auth-page-container">
      <div className="auth-page-inner">
        <Link href="/" className="auth-back-link">
          <i className="fa-solid fa-arrow-left" /> Back to ResAI
        </Link>
        <AuthCard initialMode="sign-up" onSuccess={() => router.push("/")} />
      </div>
    </div>
  );
}
