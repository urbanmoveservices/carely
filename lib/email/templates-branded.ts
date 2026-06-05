import { absoluteUrl } from "@/lib/app-url";
import { getSupportEmail, PRODUCT_NAME } from "@/lib/company";
import { wrapBrandedEmailHtml } from "@/lib/email/email-layout";
import { resolveEmailLogo } from "@/lib/email/logo-attachment";
import { sanitizeEmailSubject } from "@/lib/email/privacy";
import type { EmailTemplateKey } from "@/lib/email/template-keys";

const TEAL = "#0d9488";

function btn(href: string, label: string): string {
  return `<p style="text-align:center;margin:28px 0;">
    <a href="${href}" style="display:inline-block;background:${TEAL};color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">${label}</a>
  </p>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">${text}</p>`;
}

function footerUnsubscribe(unsubscribeLink?: string): string {
  if (!unsubscribeLink) return "";
  return `<p style="margin:16px 0 0;font-size:12px;color:#64748b;text-align:center;">
    <a href="${unsubscribeLink}" style="color:${TEAL};">Unsubscribe</a> from optional emails
  </p>`;
}

export function renderBrandedTemplate(
  key: EmailTemplateKey,
  data: Record<string, string>
): { subject: string; html: string; text: string; preheader: string } {
  const logo = resolveEmailLogo();
  const support = getSupportEmail();
  const name = data.name || "there";

  const templates: Record<
    string,
    { subject: string; preheader: string; body: string; text: string; unsubscribe?: boolean }
  > = {
    report_upload_received: {
      subject: "Your report was uploaded",
      preheader: "We received your health report.",
      body: `${p(`Hi ${name},`)}${p("We received your report upload. You can track processing in your dashboard.")}${btn(absoluteUrl("/dashboard"), "Go to dashboard")}${p("For your privacy, we do not include medical details in email.")}`,
      text: `Hi ${name}, we received your report. ${absoluteUrl("/dashboard")}`,
    },
    ai_summary_ready: {
      subject: "Your Vaidya GPT report summary is ready",
      preheader: "Your AI summary is ready for review.",
      body: `${p(`Hi ${name},`)}${p("Your AI summary is ready for review in Vaidya GPT.")}${btn(data.reportLink || absoluteUrl("/dashboard"), "View report")}${p("Open the app to see full findings — we never send lab values by email.")}`,
      text: `Your summary is ready. ${data.reportLink || absoluteUrl("/dashboard")}`,
    },
    ai_summary_failed: {
      subject: "We could not generate your report summary",
      preheader: "Please try again from your dashboard.",
      body: `${p(`Hi ${name},`)}${p(data.message || "We could not generate your AI summary. Please try again from your report page.")}${btn(data.retryLink || absoluteUrl("/dashboard"), "Open dashboard")}`,
      text: `Summary generation failed. ${data.retryLink || absoluteUrl("/dashboard")}`,
    },
    payment_success: {
      subject: "Payment successful — your plan is active",
      preheader: "Thank you for your payment.",
      body: `${p(`Hi ${name},`)}${p(`Your ${data.planName || "plan"} payment was successful.${data.amount ? ` Amount: ${data.amount}.` : ""}`)}${btn(data.billingLink || absoluteUrl("/billing"), "View billing")}`,
      text: `Payment successful for ${data.planName || "plan"}.`,
    },
    payment_failed: {
      subject: "Payment could not be completed",
      preheader: "You can retry from billing.",
      body: `${p(`Hi ${name},`)}${p("Your recent payment could not be completed.")}${btn(data.billingLink || absoluteUrl("/billing"), "Retry payment")}`,
      text: `Payment failed. ${absoluteUrl("/billing")}`,
    },
    welcome_verified: {
      subject: "Welcome to Vaidya GPT",
      preheader: "Start uploading and understanding your health reports.",
      body: `${p(`Welcome, ${name}!`)}${p("Your email is verified. Upload a lab report to get an AI summary, family tools, and reminders.")}${btn(absoluteUrl("/upload"), "Upload your first report")}`,
      text: `Welcome to ${PRODUCT_NAME}! ${absoluteUrl("/upload")}`,
      unsubscribe: true,
    },
    first_report_upload_reminder: {
      subject: "Upload your first health report",
      preheader: "Get AI insights from your lab reports.",
      body: `${p(`Hi ${name},`)}${p("Upload your first health report to unlock AI summaries and tracking.")}${btn(absoluteUrl("/upload"), "Upload report")}`,
      text: `Upload your first report: ${absoluteUrl("/upload")}`,
      unsubscribe: true,
    },
    onboarding_incomplete: {
      subject: "Complete your Vaidya GPT setup",
      preheader: "Finish onboarding to get the most from the app.",
      body: `${p(`Hi ${name},`)}${p("Your setup is incomplete. Complete your profile and onboarding steps.")}${btn(absoluteUrl("/onboarding"), "Continue setup")}`,
      text: `Complete setup: ${absoluteUrl("/onboarding")}`,
      unsubscribe: true,
    },
    report_awaiting_summary: {
      subject: "Your uploaded report is ready for AI summary",
      preheader: "Generate your AI health summary.",
      body: `${p(`Hi ${name},`)}${p("A report you uploaded is ready for AI summary generation.")}${btn(data.reportLink || absoluteUrl("/dashboard"), "Generate summary")}`,
      text: `Report awaiting summary. ${absoluteUrl("/dashboard")}`,
      unsubscribe: true,
    },
    inactive_3_days: {
      subject: "Continue your health report setup",
      preheader: "Your Vaidya GPT dashboard is waiting.",
      body: `${p(`Hi ${name},`)}${p("We have not seen you in a few days. Continue managing your health reports in Vaidya GPT.")}${btn(absoluteUrl("/dashboard"), "Open dashboard")}`,
      text: `Continue setup: ${absoluteUrl("/dashboard")}`,
      unsubscribe: true,
    },
    inactive_7_days: {
      subject: "Your health dashboard is waiting",
      preheader: "Return to Vaidya GPT when you are ready.",
      body: `${p(`Hi ${name},`)}${p("Your health dashboard is ready when you return. No medical details are sent by email.")}${btn(absoluteUrl("/dashboard"), "Open dashboard")}`,
      text: `Dashboard: ${absoluteUrl("/dashboard")}`,
      unsubscribe: true,
    },
    family_setup_reminder: {
      subject: "Add family members to manage reports together",
      preheader: "Organize family health in one place.",
      body: `${p(`Hi ${name},`)}${p("Add family members to track reports and reminders together.")}${btn(absoluteUrl("/family"), "Manage family")}`,
      text: `Family setup: ${absoluteUrl("/family")}`,
      unsubscribe: true,
    },
    plan_limit_reached: {
      subject: "You have reached your monthly limit",
      preheader: "Upgrade or wait for next month.",
      body: `${p(`Hi ${name},`)}${p(data.message || "You have reached your plan limit for this month.")}${btn(absoluteUrl("/billing"), "View plans")}`,
      text: `Plan limit reached. ${absoluteUrl("/billing")}`,
      unsubscribe: true,
    },
    reminder_due: {
      subject: "Your reminder from Vaidya GPT",
      preheader: data.title || "Health reminder",
      body: `${p(`Hi ${name},`)}${p(data.body || "You have a health reminder.")}${btn(absoluteUrl("/reminders"), "View reminders")}`,
      text: data.body || "Reminder due",
    },
    monthly_health_newsletter: {
      subject: data.subject || "Vaidya GPT health newsletter",
      preheader: data.preview || "Seasonal health education from Vaidya GPT",
      body: `${p(data.body || "Tips for staying on top of your health reports and checkups.")}${btn(absoluteUrl("/dashboard"), "Open Vaidya GPT")}`,
      text: data.body || "Newsletter",
      unsubscribe: true,
    },
    new_feature_chatbot: {
      subject: "New: Vaidya GPT health chatbot",
      preheader: "Ask questions about your saved reports.",
      body: `${p("Chat with Vaidya GPT about your uploaded reports — safely, without sharing raw lab values in email.")}${btn(absoluteUrl("/chat"), "Try chat")}`,
      text: `New chatbot feature. ${absoluteUrl("/chat")}`,
      unsubscribe: true,
    },
    new_feature_nutrition: {
      subject: "New: Indian nutrition lookup (IFCT)",
      preheader: "Look up foods and meal nutrition.",
      body: `${p("Explore Indian food nutrition powered by IFCT data in Vaidya GPT.")}${btn(absoluteUrl("/chat"), "Explore nutrition")}`,
      text: `Nutrition feature. ${absoluteUrl("/chat")}`,
      unsubscribe: true,
    },
    family_plan_promo: {
      subject: "Manage family health together",
      preheader: "Family plan for shared reports and reminders.",
      body: `${p("Upgrade to manage multiple family members and their reports in one place.")}${btn(absoluteUrl("/billing"), "View Family plan")}`,
      text: `Family plan promo. ${absoluteUrl("/billing")}`,
      unsubscribe: true,
    },
    pro_plan_promo: {
      subject: "Unlock more reports with Vaidya GPT Pro",
      preheader: "Higher limits and multi-page uploads.",
      body: `${p("Upgrade to Pro for more uploads, summaries, and chat messages each month.")}${btn(absoluteUrl("/billing"), "View Pro plan")}`,
      text: `Pro plan promo. ${absoluteUrl("/billing")}`,
      unsubscribe: true,
    },
    doctor_share_created: {
      subject: "Doctor share link created",
      preheader: "Share your report securely.",
      body: `${p(`Hi ${name},`)}${p("A secure doctor share link was created.")}${btn(data.shareLink || absoluteUrl("/sharing"), "Manage sharing")}`,
      text: `Share link created.`,
    },
  };

  const t = templates[key];
  if (!t) {
    return {
      subject: sanitizeEmailSubject(data.subject || PRODUCT_NAME),
      preheader: data.preheader || "",
      html: wrapBrandedEmailHtml({
        logo,
        preheader: data.preheader || "",
        title: PRODUCT_NAME,
        bodyHtml: p(data.message || data.body || ""),
      }),
      text: data.message || data.body || "",
    };
  }

  const subject = sanitizeEmailSubject(t.subject);
  const bodyHtml =
    t.body +
    footerUnsubscribe(t.unsubscribe ? data.unsubscribeLink : undefined) +
    p(`Questions? Contact <a href="mailto:${support}" style="color:${TEAL};">${support}</a>.`);

  return {
    subject,
    preheader: t.preheader,
    html: wrapBrandedEmailHtml({
      logo,
      preheader: t.preheader,
      title: subject,
      bodyHtml,
    }),
    text: t.text,
  };
}
