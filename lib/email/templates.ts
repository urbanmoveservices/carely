import { PRODUCT_NAME } from "@/lib/company";
import { absoluteUrl } from "@/lib/app-url";

export type EmailTemplateType =
  | "email_verification"
  | "password_reset"
  | "doctor_share"
  | "caregiver_invite"
  | "reminder"
  | "monthly_digest"
  | "support_ticket";

export function renderEmailTemplate(
  type: EmailTemplateType,
  data: Record<string, string>
): { subject: string; html: string; text: string } {
  switch (type) {
    case "email_verification":
      return {
        subject: `Verify your ${PRODUCT_NAME} email`,
        html: `<p>Hello,</p><p>Verify your email: <a href="${data.link}">${data.link}</a></p>`,
        text: `Verify: ${data.link}`,
      };
    case "password_reset":
      return {
        subject: `Reset your ${PRODUCT_NAME} password`,
        html: `<p>Reset password: <a href="${data.link}">${data.link}</a></p><p>If you did not request this, ignore this email.</p>`,
        text: `Reset: ${data.link}`,
      };
    case "doctor_share":
      return {
        subject: `Medical report shared via ${PRODUCT_NAME}`,
        html: `<p>A report was shared with you: <a href="${data.link}">${data.link}</a></p>`,
        text: data.link || "",
      };
    case "caregiver_invite":
      return {
        subject: `Caregiver invite — ${PRODUCT_NAME}`,
        html: `<p>You were invited as a caregiver: <a href="${data.link}">${data.link}</a></p>`,
        text: data.link || "",
      };
    case "reminder":
      return {
        subject: data.title || `Reminder — ${PRODUCT_NAME}`,
        html: `<p>${data.body || "You have a health reminder."}</p><p><a href="${absoluteUrl("/reminders")}">View reminders</a></p>`,
        text: data.body || "",
      };
    case "monthly_digest":
      return {
        subject: `Your ${PRODUCT_NAME} monthly health digest`,
        html: `<p>${data.summary || "Your monthly summary is ready."}</p>`,
        text: data.summary || "",
      };
    case "support_ticket":
      return {
        subject: `Support ticket update — ${data.subject || PRODUCT_NAME}`,
        html: `<p>${data.message || "Your ticket was updated."}</p>`,
        text: data.message || "",
      };
    default:
      return {
        subject: PRODUCT_NAME,
        html: `<p>${data.message || ""}</p>`,
        text: data.message || "",
      };
  }
}
