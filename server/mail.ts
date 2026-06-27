import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import db from "./db.js";

let transporter: any = null;

export function getTransporter() {
  if (!transporter) {
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_APP_PASSWORD;
    if (!user || !pass) {
      return null;
    }
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
}

interface SendMailParams {
  recipient: string;
  subject: string;
  body: string;
  attachments?: { filename: string; path: string }[];
}

export async function sendMail({ recipient, subject, body, attachments = [] }: SendMailParams) {
  // Validate recipient email address
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipient)) {
    throw new Error(`Invalid recipient email address: "${recipient}"`);
  }

  if (!subject.trim()) {
    throw new Error("Email subject cannot be empty.");
  }

  if (!body.trim()) {
    throw new Error("Email body cannot be empty.");
  }

  const client = getTransporter();
  const mailOptions = {
    from: process.env.MAIL_USER ? `"SAUVEUR Dispatch" <${process.env.MAIL_USER}>` : '"SAUVEUR Dispatch" <dispatch@sauveur.ai>',
    to: recipient,
    subject,
    text: body,
    html: body.replace(/\n/g, "<br>"),
    attachments: attachments.map(att => ({
      filename: att.filename,
      path: att.path
    }))
  };

  if (!client) {
    console.log("=================== SIMULATED GMAIL SMTP DISPATCH ===================");
    console.log(`FROM: ${mailOptions.from}`);
    console.log(`TO: ${recipient}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY:\n${body}`);
    console.log(`ATTACHMENTS: ${attachments.map(a => a.filename).join(", ") || "None"}`);
    console.log("====================================================================");
    return { simulated: true, messageId: `sim_${Date.now()}` };
  }

  const info = await client.sendMail(mailOptions);
  return { simulated: false, messageId: info.messageId };
}
