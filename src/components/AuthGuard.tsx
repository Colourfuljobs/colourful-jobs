"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageLoader } from "@/components/ui/page-loader";

type UserStatus = "pending_onboarding" | "active" | "invited";

interface AuthGuardProps {
  children: React.ReactNode;
  /**
   * Which statuses are allowed to view this content
   * If user's status is not in this list, they will be redirected
   */
  allowedStatuses: UserStatus[];
  /**
   * Where to redirect if user is not authenticated
   * @default "/login"
   */
  redirectIfUnauthenticated?: string;
  /**
   * Where to redirect if user's status is not allowed
   * This is a function that receives the status and returns the redirect path
   */
  getRedirectPath?: (status: UserStatus) => string;
  /**
   * Show a loading spinner while checking auth
   * @default true
   */
  showLoader?: boolean;
}

/**
 * Default redirect paths based on user status
 */
function getDefaultRedirectPath(status: UserStatus): string {
  switch (status) {
    case "pending_onboarding":
      return "/onboarding";
    case "active":
      return "/dashboard";
    case "invited":
      return "/login";
    default:
      return "/login";
  }
}

/**
 * AuthGuard component that protects routes based on user authentication status
 * 
 * Usage:
 * ```tsx
 * // Only allow active users
 * <AuthGuard allowedStatuses={["active"]}>
 *   <DashboardContent />
 * </AuthGuard>
 * 
 * // Only allow pending_onboarding users
 * <AuthGuard allowedStatuses={["pending_onboarding"]}>
 *   <OnboardingContent />
 * </AuthGuard>
 * ```
 */
export function AuthGuard({
  children,
  allowedStatuses,
  redirectIfUnauthenticated = "/login",
  getRedirectPath = getDefaultRedirectPath,
  showLoader = true,
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Still loading session
    if (status === "loading") {
      return;
    }

    // Not authenticated
    if (status === "unauthenticated" || !session?.user) {
      router.push(redirectIfUnauthenticated);
      return;
    }

    // Check user status
    const userStatus = session.user.status as UserStatus;

    if (allowedStatuses.includes(userStatus)) {
      // User is authorized
      setIsAuthorized(true);
    } else {
      // User is not authorized, redirect to appropriate page
      const redirectPath = getRedirectPath(userStatus);
      router.push(redirectPath);
    }
  }, [status, session, allowedStatuses, redirectIfUnauthenticated, getRedirectPath, router]);

  // Show loading state
  if (status === "loading" || !isAuthorized) {
    if (!showLoader) {
      return null;
    }
    
    return <PageLoader />;
  }

  return <>{children}</>;
}
