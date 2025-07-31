# 🐠 Nemo (mnews)

Personal newsletter aggregation and digest system

Nemo helps you find your newsletters in the vast ocean of email by aggregating forwarded newsletters into a single, searchable dashboard!

## Features

- 📧 **Email forwarding integration** - Forward newsletters to a webhook
- 🔍 **Search and filter** - Find newsletters by sender or content  
- 📱 **Mobile-friendly** - Check your news on any device
- 🕐 **Recency indicators** - See what's new today
- 📄 **Expandable content** - Read full newsletters in-place
- 🏷️ **Source filtering** - Focus on specific newsletter sources

## Project Structure

```text
├── .devnotes/         # Local development notes and documentation (not version controlled)
├── components/        # React components
├── pages/            # Next.js pages and API routes
├── public/           # Static files
├── styles/           # Global styles
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
# or
yarn install
```

### 2. Development Server
```bash
npm run dev
# or  
yarn dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the dashboard.

### 3. Deploy to Vercel
```bash
# Connect to GitHub repo and deploy
npx vercel

# Your webhook will be available at:
# https://your-project.vercel.app/api/webhook
```

### 4. Set Up Email Forwarding

Forward your newsletters to your webhook endpoint:
```
https://your-project.vercel.app/api/webhook
```

The webhook expects POST requests with email data:
```json
{
  "from": "newsletter@example.com",
  "subject": "Daily News Digest",
  "text": "Newsletter content...",
  "date": "2025-07-07T10:00:00Z"
}
```

## Project Structure

```text
mnews/
├── .devnotes/                 # Local development notes and documentation (not version controlled)
│
├── components/                # React components
│   ├── ui/                    # Reusable UI components (buttons, cards, etc.)
│   ├── newsletter/            # Newsletter-specific components
│   ├── article/               # Article display components
│   └── layout/                # Layout components (headers, grids, etc.)
│
├── pages/                     # Next.js pages and API routes
│   ├── api/                   # API routes
│   │   ├── webhook.ts         # Email receiver webhook
│   │   ├── newsletters.ts     # Newsletter data API
│   │   └── debug/             # Debug and development endpoints
│   ├── _app.tsx               # Next.js app wrapper
│   └── index.tsx              # Main dashboard
│
├── public/                    # Static files
│   └── ...
│
├── styles/                    # Global styles
│   └── globals.css
│
├── types/                     # TypeScript type definitions
│   └── index.ts
│
├── utils/                     # Utility functions
│   └── ...
│
├── lib/                       # Core application logic
│   ├── api/                   # API client utilities
│   └── storage/               # Data storage utilities
│
├── hooks/                     # Custom React hooks
│   └── ...
│
└── context/                   # React context providers
    └── ...
```

## Configuration

### Email Service Integration

The webhook is designed to work with email forwarding services. You may need to adjust the webhook format based on your email provider:

- **Zapier Email Parser**
- **Gmail forwarding rules**  
- **SendGrid Inbound Parse**
- **Mailgun Routes**

### Environment Variables

Create `.env.local` for any configuration:
```env
# Optional: Add webhook authentication
WEBHOOK_SECRET=your-secret-key

# Optional: Configure storage
STORAGE_PATH=./data/newsletters.json
```

## Development

### Adding Features

- **RSS integration** - Add RSS feed parsing alongside email
- **AI summarization** - Integrate with OpenAI for newsletter summaries
- **Email digests** - Send daily/weekly digest emails
- **Export functionality** - Export newsletters to various formats

### Testing Webhook Locally

Use ngrok to test email forwarding during development:
```bash
# Install ngrok
npm install -g ngrok

# In one terminal
npm run dev

# In another terminal  
ngrok http 3000

# Use the ngrok URL for webhook testing
# https://abc123.ngrok.io/api/webhook
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with Next.js, TypeScript, and a love for organized information** 📰

*"Just keep swimming... through newsletters!"* 🐠
