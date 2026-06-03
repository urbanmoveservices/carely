"use client";



import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { useAuth } from "./AuthProvider";

import { Skeleton } from "./ui/Skeleton";



export function ProtectedRoute({ children }: { children: React.ReactNode }) {

  const { user, loading } = useAuth();

  const router = useRouter();



  useEffect(() => {

    if (!loading && !user) {

      router.replace("/login");

    }

  }, [loading, user, router]);



  if (loading) {

    return (

      <div className="flex min-h-screen items-center justify-center bg-gray-50">

        <div className="space-y-4 w-64">

          <Skeleton className="h-8 w-full" />

          <Skeleton className="h-4 w-3/4" />

          <Skeleton className="h-4 w-1/2" />

        </div>

      </div>

    );

  }



  if (!user) return null;



  return <>{children}</>;

}


