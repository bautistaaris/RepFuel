import "server-only";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export interface EmailService {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailService implements EmailService {
  readonly name = "console";

  async send(message: EmailMessage): Promise<void> {
    console.log(`[EmailService:console] to=${message.to} subject=${message.subject}`);
    console.log(`[EmailService:console] body:\n${message.text}`);
  }
}

class ResendEmailService implements EmailService {
  readonly name = "resend";

  constructor(private apiKey: string, private from: string) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend error: ${res.status} ${await res.text()}`);
    }
  }
}

let cached: EmailService | null = null;

export function getEmailService(): EmailService {
  if (cached) return cached;
  const provider = (process.env.EMAIL_PROVIDER ?? "console").toLowerCase();
  if (provider === "resend" && process.env.EMAIL_API_KEY && process.env.EMAIL_FROM) {
    cached = new ResendEmailService(process.env.EMAIL_API_KEY, process.env.EMAIL_FROM);
  } else {
    cached = new ConsoleEmailService();
  }
  return cached;
}

export function resetEmailCache(): void {
  cached = null;
}