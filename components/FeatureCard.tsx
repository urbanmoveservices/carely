import React from "react";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="group rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md hover:border-brand-200">
      <div className="mb-3 inline-flex rounded-xl bg-brand-50 p-3 group-hover:bg-brand-100 transition-colors">
        <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-brand-600" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
