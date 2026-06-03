import { AppHeader } from "@/components/AppHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { HomeHero } from "@/components/HomeHero";
import {
  LandingFeatures,
  LandingHowItWorks,
} from "@/components/LandingSections";
import { LandingPlans } from "@/components/LandingPlans";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <HomeHero />
      <LandingHowItWorks />
      <LandingFeatures />
      <LandingPlans />
      <PublicFooter />
    </div>
  );
}
