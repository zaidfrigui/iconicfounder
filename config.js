/* ============================================================
   CONFIG — the only file you need to edit to go live.
   ============================================================ */
window.PB_CONFIG = {
  // Your mentoring brand name, shown on the welcome screen and header.
  brandName: "Iconic Founders",

  // Your first name, used in buttons like "Send to Zaid".
  mentorName: "Zaid",

  // Your WhatsApp number in international format, digits only, no "+" or spaces.
  // Example for 06 12 34 56 78 in Morocco → "212612345678"
  mentorWhatsApp: "212701777576",

  // Free access key from https://web3forms.com (enter your email, the key arrives by email).
  // While this is left as-is, the questionnaire skips email sending and goes straight to
  // the backup (download file + WhatsApp).
  web3formsKey: "YOUR-WEB3FORMS-ACCESS-KEY",

  // Market of the client. Only "MA" (Morocco) exists for now — see markets in questions.js.
  defaultMarket: "MA",

  // Languages offered on the welcome screen (must exist in translations.js).
  languages: ["en", "fr", "ar"],

  // Bump this when you change questions, so you know which version a client answered.
  questionnaireVersion: "1.0.0"
};
