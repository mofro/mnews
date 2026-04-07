import { NextApiRequest, NextApiResponse } from "next";

// Placeholder for future email digest delivery.
// When ready: integrate Resend or similar, render with React Email.
//
// Vercel cron (disabled until implemented):
// vercel.json: { "crons": [{ "path": "/api/send-digest", "schedule": "0 7 * * *" }] }

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(501).json({
    message: "Email delivery not yet configured",
  });
}
