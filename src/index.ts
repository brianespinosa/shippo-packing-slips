import dotenv from 'dotenv';

// Load environment variables (.env.local overrides .env)
dotenv.config();
dotenv.config({ override: true, path: '.env.local' });

// Verify environment setup
const apiToken = process.env.SHIPPO_API_TOKEN;

if (!apiToken) {
  console.error('Error: SHIPPO_API_TOKEN not found in environment');
  process.exit(2);
}

console.log('Environment configured successfully');
console.log('API Token loaded:', apiToken.substring(0, 20) + '...');

// This will be the main entry point for the CLI
// Currently just validates the setup
