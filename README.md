# 📰 MNews

Modern Newsletter Management System

MNews is a powerful tool for managing and reading newsletters in a clean, organized interface. It helps you take control of your newsletter subscriptions and reading experience.

## ✨ Features

- 📧 **Email Integration** - Webhook support for receiving newsletters
- 📱 **Responsive Design** - Optimized for all device sizes
- 🔍 **Content Processing** - Clean, readable formatting of newsletter content
- 🏷️ **Organization** - Mark as read/unread, archive, and filter newsletters
- 📊 **Statistics** - Track your reading habits and newsletter sources
- ⚡ **Fast** - Built with Next.js for optimal performance

## 🏗️ Project Structure

```text
├── .devnotes/         # Development documentation and notes
├── components/        # Reusable React components
│   ├── article/      # Article display components
│   ├── common/       # Shared UI components
│   ├── layout/       # Layout components
│   └── newsletter/   # Newsletter-specific components
├── context/          # React context providers
├── data/             # Static data files
├── docs/             # Project documentation
├── hooks/            # Custom React hooks
├── lib/              # Core application logic
│   └── cleaners/     # Content cleaning utilities
├── pages/
│   ├── api/          # API routes
│   └── ...           # Next.js pages
├── public/           # Static assets
├── scripts/          # Utility scripts
├── styles/           # Global styles
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- Redis (Upstash Redis recommended)
- npm or yarn

### 1. Clone the Repository

```bash
git clone https://github.com/mofro/mnews.git
cd mnews
```

### 2. Install Dependencies

```bash
npm install
# or
yarn
```

### 3. Environment Setup

Create a `.env.local` file:

```env
KV_REST_API_URL=your_redis_url
KV_REST_API_TOKEN=your_redis_token
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4. Development Server

```bash
npm run dev
# or
yarn dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📦 Production Build

```bash
npm run build
npm start
```

## 🔧 Development

### Available Scripts

- `dev` - Start development server
- `build` - Create production build
- `start` - Start production server
- `lint` - Run ESLint
- `test` - Run tests

### Code Style

This project uses:

- ESLint for code linting
- Prettier for code formatting
- TypeScript for type safety

### Documentation

- [API Documentation](./.devnotes/actual-api-endpoints.md)
- [Architecture](./.devnotes/architecture.md)
- [Technical Specifications](./.devnotes/technical-spec.md)

## 📝 License

MIT © [Your Name]

## 🔄 Quick Reference

```bash
# Test migration with sample data
npm run migrate:test

# Dry run (no changes)
npm run migrate:newsletters

# Run actual migration
npm run migrate:newsletters:run

# Rollback if needed
npm run migrate:rollback:run
```

## 🚀 Deployment

### Deploy to Vercel

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

_"Just keep swimming... through newsletters!"_ 🐠
