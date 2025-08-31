# Thinkbook - AI-chat with jupyter-Style Notebook in the browser

A modern, frontend-only web application that integrates Jupyter-style notebook functionality with AI chat

## Features

- **Python Execution**: Run Python code in the browser using Pyodide WebAssembly
- **AI Chat Integration**: Get help from Gemini AI while working with your notebooks
- **Database Connectivity**: Connect to Snowflake databases for data analysis
- **Unified Interface**: Seamless chat and code execution in a single conversation flow
- **Persistent Storage**: Settings and configurations stored locally

## Technologies Used

### Core Framework

- **Vite** - Fast build tool and development server
- **React 18** - UI framework with TypeScript
- **Tailwind CSS** - Utility-first CSS framework

### Code Execution

- **Pyodide** - Python runtime via WebAssembly
- **Monaco Editor** - VS Code-powered code editor
- **Web Workers** - Isolated Python execution environment

### AI & External APIs

- **Vercel AI SDK** - Streaming AI responses
- **Google Generative AI** - Gemini 2.5 Flash model
- **Snowflake REST API** - Database connectivity

### State Management & Storage

- **Zustand** - Lightweight state management
- **LocalForage** - Enhanced localStorage with async API
- **React Icons** - Icon library

### Development & Testing

- **TypeScript** - Type safety and developer experience
- **ESLint + Prettier** - Code quality and formatting
- **Playwright** - End-to-end testing
- **Vitest** - Unit testing framework

## Key Considerations

### Frontend-Only Architecture

This application runs entirely in the browser with no backend server:

- API keys are stored in localStorage (users must provide their own)
- Direct API calls to external services (Gemini AI, Snowflake)
- CORS considerations for external API access

### Security

- No server-side credential storage
- Users manage their own API keys through the settings modal
- All external API calls made directly from frontend

### Performance

- Web Workers isolate Python execution from UI thread
- Pyodide loaded from CDN for Python runtime
- Vite's fast development and optimized production builds

## Directory Structure

```
/
├── docs/
│   ├── user-stories/     # Feature specifications
│   ├── prompts/          # Reusable AI agent prompts
│   ├── ARCHITECTURE.md   # System architecture documentation
│   └── IMPLEMENTED.md    # Implementation tracking
├── src/
│   ├── components/       # React components
│   ├── services/         # API services (Snowflake, AI, etc.)
│   ├── utils/            # Shared utilities
│   └── hooks/            # Custom React hooks
├── tests/                # Playwright e2e tests
└── public/               # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+
- Your own API keys:
  - Gemini API key from Google AI Studio
  - Snowflake access token and hostname (optional)

### Installation

```bash
# Clone and setup
npm install

# Start development server
npm run dev

# Run tests
npm run test        # Unit tests
npm run test:e2e    # End-to-end tests

# Build for production
npm run build
```

### First Run

1. Open the application in your browser
2. Enter your Gemini API key in the settings modal
3. (Optional) Configure Snowflake credentials for database access
4. Start writing Python code or chatting with the AI assistant

## Development

### Code Quality

```bash
npm run lint        # ESLint checks
npm run format      # Prettier formatting
npm run typecheck   # TypeScript compilation
```

### Testing

- Unit tests with Vitest for components and utilities
- Playwright tests for end-to-end user workflows
- All tests run in CI/CD pipeline

## Contributing

1. Review user stories in `/docs/user-stories/`
2. Follow existing code patterns and conventions
3. Add tests for new functionality
4. Update documentation as needed
5. Run linting and tests before submitting

## License

[Add your license information here]
