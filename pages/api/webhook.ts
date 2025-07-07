import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

interface NewsletterEmail {
  id: string
  sender: string
  subject: string
  date: string
  content: string
  raw?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Extract email data from request
    // This will depend on your email forwarding service format
    const { from, subject, text, html, date } = req.body
    
    // Basic validation
    if (!from || !subject) {
      return res.status(400).json({ message: 'Missing required email fields' })
    }

    // Create newsletter entry
    const newsletter: NewsletterEmail = {
      id: Date.now().toString(),
      sender: from,
      subject: subject,
      date: date || new Date().toISOString(),
      content: text || html || '',
      raw: JSON.stringify(req.body)
    }

    // Store the newsletter
    await storeNewsletter(newsletter)
    
    console.log(`📧 Stored newsletter: ${subject} from ${from}`)
    
    res.status(200).json({ 
      message: 'Newsletter received and stored',
      id: newsletter.id 
    })
    
  } catch (error) {
    console.error('❌ Webhook error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

async function storeNewsletter(newsletter: NewsletterEmail) {
  const dataDir = path.join(process.cwd(), 'data')
  const filePath = path.join(dataDir, 'newsletters.json')
  
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  
  // Read existing newsletters
  let newsletters: NewsletterEmail[] = []
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8')
    newsletters = JSON.parse(data)
  }
  
  // Add new newsletter
  newsletters.unshift(newsletter) // Add to beginning
  
  // Keep only last 1000 newsletters (prevent file from growing forever)
  if (newsletters.length > 1000) {
    newsletters = newsletters.slice(0, 1000)
  }
  
  // Write back to file
  fs.writeFileSync(filePath, JSON.stringify(newsletters, null, 2))
}