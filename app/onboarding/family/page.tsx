"use client";



import { useState } from "react";

import { useRouter } from "next/navigation";

import { OnboardingShell } from "@/components/OnboardingShell";

import { Button } from "@/components/ui/Button";

import { Input } from "@/components/ui/Input";

import { Label } from "@/components/ui/Label";

import { ProtectedRoute } from "@/components/ProtectedRoute";

import { OnboardingExitControls } from "@/components/onboarding/OnboardingExitControls";

import { api } from "@/lib/api-client";

import { useAuth } from "@/components/AuthProvider";

import { RELATIONS, normalizeFamilyPayload } from "@/lib/family-schemas";

import type { FamilyMemberInput } from "@/types";



export default function OnboardingFamilyPage() {

  return (

    <ProtectedRoute>

      <OnboardingFamily />

    </ProtectedRoute>

  );

}



function OnboardingFamily() {

  const { user } = useAuth();

  const router = useRouter();

  const [mode, setMode] = useState<"self" | "member" | "skip">("self");

  const [fullName, setFullName] = useState("");

  const [relation, setRelation] = useState<FamilyMemberInput["relation"]>("mother");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");



  const goToUpload = () => {

    setError("");

    router.push("/onboarding/upload");

  };



  const continueNext = async () => {

    setLoading(true);

    setError("");

    try {

      if (mode === "skip") {

        goToUpload();

        return;

      }



      if (mode === "self" && user) {

        const name = (user.name || "Myself").trim();

        if (name.length < 2) {

          setError(

            "Your profile name must be at least 2 characters. Go back to the profile step or skip family setup."

          );

          return;

        }



        const existing = await api.getFamilyMembers();

        const hasSelf = existing.some((m) => m.relation === "self");

        if (!hasSelf) {

          await api.createFamilyMember(

            normalizeFamilyPayload({

              fullName: name,

              relation: "self",

            })

          );

        }

      } else if (mode === "member") {

        const name = fullName.trim();

        if (name.length < 2) {

          setError("Full name must be at least 2 characters.");

          return;

        }

        if (!relation) {

          setError("Please enter a valid name and relation.");

          return;

        }



        await api.createFamilyMember(

          normalizeFamilyPayload({

            fullName: name,

            relation,

          })

        );

      }



      goToUpload();

    } catch (e: unknown) {

      const msg = e instanceof Error ? e.message : "Could not add family member";

      if (msg.includes("nonoptional") || msg.includes("Invalid input")) {

        setError("Please enter a valid name and relation.");

      } else {

        setError(msg);

      }

    } finally {

      setLoading(false);

    }

  };



  return (

    <OnboardingShell step={3}>

      <h1 className="text-xl font-bold text-gray-900 mb-2">Family health</h1>

      <p className="text-sm text-gray-500 mb-6">

        Add yourself or someone you care for. You can add more later.

      </p>

      <div className="space-y-2 mb-4">

        {(

          [

            ["self", "Add myself as family member"],

            ["member", "Add a family member"],

            ["skip", "Skip for now"],

          ] as const

        ).map(([val, label]) => (

          <button

            key={val}

            type="button"

            onClick={() => {

              setMode(val);

              setError("");

            }}

            className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${

              mode === val ? "border-brand-600 bg-brand-50" : "border-gray-200"

            }`}

          >

            {label}

          </button>

        ))}

      </div>

      {mode === "member" && (

        <div className="space-y-3 mb-4">

          <div>

            <Label>Full name</Label>

            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />

          </div>

          <div>

            <Label htmlFor="relation">Relation</Label>

            <select

              id="relation"

              value={relation}

              onChange={(e) =>

                setRelation(e.target.value as FamilyMemberInput["relation"])

              }

              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[44px]"

            >

              {RELATIONS.filter((r) => r !== "self").map((r) => (

                <option key={r} value={r}>

                  {r.charAt(0).toUpperCase() + r.slice(1).replace(/_/g, " ")}

                </option>

              ))}

            </select>

          </div>

        </div>

      )}

      {error && (

        <p className="text-sm text-red-600 mb-2" role="alert">

          {error}

        </p>

      )}

      <Button className="w-full" onClick={continueNext} loading={loading}>

        Continue

      </Button>

      <OnboardingExitControls />

    </OnboardingShell>

  );

}


