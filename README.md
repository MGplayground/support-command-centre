# Ultimate Support Cockpit & AI Assistant

A native desktop widget built with Electron.js that provides Tier 2 Support teams with real-time performance metrics, AI-powered troubleshooting assistance, and gamified productivity tracking.

## Features

### 🎯 Live Stats Center
- **Intercom Integration**: Real-time chat volume and CSAT scores with intelligent filtering
- **Jira Integration**: Ticket counts by project with SLA countdown timers
- **Smart Filtering**: Automatically excludes CSAT ratings tagged with spam, free accounts, or banned users

### 🤖 AI Technical Debugger (RAG)
- Global search interface powered by Retrieval-Augmented Generation
- Searches internal Confluence documentation automatically
- Generates step-by-step troubleshooting guidance via OpenAI/Anthropic
- Responds as a "Senior Tier 3 Engineer" persona

### 🛍️ Shopify Customer Search
- Search customer orders by email
- Displays last 3 orders with status and line items
- Real-time order information via GraphQL

### 🎮 Gamification
- Live bonus tracker ($2.00 per ticket closed)
- Visual progress bar showing daily goals
- "On Fire" 🔥 animation when closing 5+ tickets in 1 hour
- Streak counter with multiplier effects

### ⚡ Performance
- 5-minute intelligent caching layer prevents API rate-limiting
- Always-on-top, frameless window design
- Glassmorphism UI with smooth animations

## Installation

```bash
# Install dependencies
npm install

# Run in development mode with mock data
npm run electron:dev

# Build for production
npm run build
npm run electron
```

## Configuration

Create a `.env` file in the root directory (copy from `.env.example` if it exists):

```env
# Development Mode
VITE_USE_MOCK_DATA=true

# Intercom
VITE_INTERCOM_TOKEN=your_token_here

# Jira
VITE_JIRA_URL=https://your-domain.atlassian.net
VITE_JIRA_EMAIL=your-email@example.com
VITE_JIRA_TOKEN=your_token_here
VITE_JIRA_PROJECTS=REVIEWS,INFLUENCE,BOOST

# Shopify
VITE_SHOPIFY_STORE_URL=your-store.myshopify.com
VITE_SHOPIFY_ACCESS_TOKEN=your_token_here

# Confluence
VITE_CONFLUENCE_URL=https://your-domain.atlassian.net
VITE_CONFLUENCE_EMAIL=your-email@example.com
VITE_CONFLUENCE_TOKEN=your_token_here
VITE_CONFLUENCE_SPACE=clearerio

# LLM Provider
VITE_LLM_PROVIDER=openai
VITE_OPENAI_API_KEY=your_openai_key_here
```

## Development Mode

Set `VITE_USE_MOCK_DATA=true` to use mock data instead of real API calls. This allows you to:
- Test the UI without API credentials
- Develop offline
- Preview all features with realistic sample data

## Tech Stack

- **Electron.js** - Desktop application framework
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Modern styling with custom animations
- **Vite** - Fast build tool
- **OpenAI/Anthropic** - LLM providers for AI responses
- **GraphQL** - Shopify API queries

## Project Structure

```
hackathon/
├── electron/
│   ├── main.js              # Electron main process
│   └── preload.js           # IPC bridge
├── src/
│   ├── components/
│   │   ├── StatsCenter.tsx      # Intercom + Jira stats
│   │   ├── ShopifySearch.tsx    # Customer order search
│   │   ├── AIDebugger.tsx       # RAG-powered chat
│   │   └── BonusMetrics.tsx     # Gamification UI
│   ├── services/
│   │   ├── api-cache.ts         # 5-minute caching layer
│   │   ├── intercom.ts          # Intercom API
│   │   ├── jira.ts              # Jira API
│   │   ├── shopify.ts           # Shopify GraphQL
│   │   ├── confluence.ts        # Confluence search
│   │   ├── rag.ts               # RAG orchestration
│   │   └── llm.ts               # LLM provider
│   ├── utils/
│   │   └── gamification.ts      # Bonus & streak logic
│   └── App.tsx              # Main React app
└── package.json
```

## Window Behavior

The application is configured as:
- **Always-on-top**: Stays visible above all other windows
- **Frameless**: No traditional title bar
- **Draggable**: Click and drag the title area to move
- **Transparent**: Glassmorphism effects

## API Caching

All API calls are automatically cached for 5 minutes to prevent rate-limiting:
- Intercom stats refresh every 5 min
- Jira tickets refresh every 5 min
- Shopify searches cached per email
- Confluence searches cached per query

## Gamification Rules

- **Bonus**: $2.00 per ticket closed
- **Streak**: Close 5+ tickets in 1 hour to trigger "On Fire" mode
- **Visual Effects**: Flame animations, sparkles, and progress bars
- **Auto-tracking**: Ticket closes are tracked automatically

## CSAT Filtering

Intercom CSAT ratings are automatically filtered to exclude:
- Tags matching: `[RI] Exclude CSAT Spam`
- Tags matching: `[Ri] Exclude CSAT Free Plan`
- Tags matching: `[RI] Exclude CSAT [Banned Account]`

## Troubleshooting

### App won't start
- Ensure all dependencies are installed: `npm install`
- Check Node.js version (v18+ recommended)
- Verify `.env` file exists or use mock data mode

### API errors
- Set `VITE_USE_MOCK_DATA=true` to bypass API calls
- Verify API tokens are correct and have proper permissions
- Check network connectivity

### Window not appearing
- Check if the app is minimized
- Try closing and restarting
- Check console for Electron errors

## License

MIT
