export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Return all environment variables (be careful with sensitive data in production)
  res.status(200).json({
    kvRestApiUrl: process.env.KV_REST_API_URL ? 'Set (hidden for security)' : 'Not set',
    kvRestApiToken: process.env.KV_REST_API_TOKEN ? 'Set (hidden for security)' : 'Not set',
    nodeEnv: process.env.NODE_ENV,
    // Add more variables as needed
  });
}
