# Nonprofit Trolley Game - Enhanced Edition

A real-time, multiplayer ethical decision-making game designed for nonprofit organizations to explore AI ethics and decision-making scenarios. Built with React, Node.js, Socket.io, and Neon PostgreSQL.

## 🎮 Live Demo

[Play the Game](https://nonprofit-trolley-game.netlify.app)

## ✨ Features

- **Real-time Multiplayer**: Support for up to 200 concurrent participants
- **Ethical Scenarios**: Curated AI ethics dilemmas relevant to nonprofit work
- **Anonymous Voting**: Secure, anonymous decision tracking
- **Live Results**: Real-time vote aggregation and visualization
- **Facilitator Mode**: Special controls for session moderators
- **Rationale Collection**: Capture reasoning behind decisions
- **Mitigation Strategies**: Collect ideas for risk mitigation
- **Security Enhanced**: JWT authentication, input sanitization, rate limiting
- **Production Ready**: Database transactions, retry logic, circuit breakers

## 🏗️ Architecture

### Frontend
- **Framework**: React 19 with TypeScript
- **State Management**: Zustand
- **Real-time**: Socket.io Client
- **Styling**: Tailwind CSS
- **Visualizations**: D3.js
- **Deployment**: Netlify

### Backend
- **Server**: Node.js with Express
- **Database**: Neon PostgreSQL
- **ORM**: Drizzle ORM
- **Real-time**: Socket.io
- **Authentication**: JWT
- **Rate Limiting**: Redis-backed flexible rate limiter
- **Monitoring**: Winston logging + Sentry

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (via Neon)
- Redis (optional, for enhanced rate limiting)

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/nonprofit-trolley-game-enhanced.git
cd nonprofit-trolley-game-enhanced
```

2. Set up environment variables:

**Server (.env)**:
```env
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
PORT=3001
CLIENT_URL=http://localhost:3000
JWT_SECRET=your-secret-key-change-in-production
REDIS_URL=redis://localhost:6379
SENTRY_DSN=your-sentry-dsn-optional
NODE_ENV=development
```

**Client (.env.local)**:
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_ENVIRONMENT=development
```

### Installation

1. Install server dependencies:
```bash
cd server
npm install
```

2. Install client dependencies:
```bash
cd ../client
npm install
```

### Database Setup

1. Create a Neon database at [neon.tech](https://neon.tech)

2. Run migrations:
```bash
cd server
npm run db:push
npm run db:migrate
```

### Development

1. Start the backend server:
```bash
cd server
npm run dev
```

2. Start the frontend (in a new terminal):
```bash
cd client
npm start
```

3. Open http://localhost:3000

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based auth for Socket.io connections
- **Input Sanitization**: XSS prevention via DOMPurify
- **Rate Limiting**: Configurable limits per endpoint
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **CORS Configuration**: Restricted origin access
- **Helmet.js**: Security headers
- **Connection Throttling**: IP-based connection limits

## 🔄 Reliability Features

- **Database Transactions**: Atomic operations for data consistency
- **Retry Logic**: Exponential backoff for failed requests
- **Circuit Breakers**: Prevent cascading failures
- **Connection Pooling**: Optimized database connections
- **Health Checks**: Monitoring endpoints
- **Graceful Shutdown**: Clean connection cleanup

## 📊 Performance Optimizations

- **Query Optimization**: Single aggregated queries for vote summaries
- **Connection Pooling**: 20 concurrent database connections
- **Socket.io Rooms**: Efficient event broadcasting
- **Volatile Events**: Non-critical updates without acknowledgment
- **Event Batching**: Reduced network overhead

## 🧪 Testing

```bash
# Run server tests
cd server
npm test

# Run client tests
cd client
npm test

# Run E2E tests
npm run test:e2e
```

## 📦 Deployment

### Backend (Railway/Render/Fly.io)

1. Push to GitHub
2. Connect repository to your platform
3. Set environment variables
4. Deploy

### Frontend (Netlify)

1. Build the client:
```bash
cd client
npm run build
```

2. Deploy to Netlify:
```bash
netlify deploy --prod --dir=build
```

### Database (Neon)

1. Create production database
2. Run migrations
3. Update DATABASE_URL in production

## 📈 Monitoring

- **Logs**: Winston logging to files and console
- **Errors**: Sentry integration for error tracking
- **Metrics**: Health check endpoints
- **Database**: Connection pool monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Original concept inspired by MIT's Moral Machine
- Built for nonprofit organizations exploring AI ethics
- Enhanced with production-ready features and security

## 🔧 Troubleshooting

### Common Issues

**Connection Refused**
- Check server is running on correct port
- Verify DATABASE_URL is correct
- Ensure Redis is running (if configured)

**CORS Errors**
- Verify CLIENT_URL in server .env
- Check API_URL in client .env

**Socket Disconnections**
- Check JWT token generation
- Verify WebSocket support
- Review firewall settings

**Database Errors**
- Verify Neon connection string
- Check SSL requirements
- Review connection pool settings

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check logs in `server/logs/`
- Review documentation in `/docs`

## 🚀 Roadmap

- [ ] Multi-language support
- [ ] Custom scenario builder
- [ ] Advanced analytics dashboard
- [ ] Export functionality
- [ ] Mobile app
- [ ] Accessibility improvements
- [ ] AI-powered scenario generation

---

Built with ❤️ for the nonprofit sector