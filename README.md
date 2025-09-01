# 🎮 Nonprofit AI Ethics Trolley Game

An interactive multiplayer web application that explores AI ethics through nonprofit sector scenarios. Participants vote on real-time trolley problem dilemmas specifically designed for nonprofit organizations, fostering discussion about AI implementation, bias, equity, and ethical decision-making in the social sector.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/joshuamtm/nonprofit-trolley-game)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-realtime-green)](https://supabase.com/)
[![Accessibility](https://img.shields.io/badge/WCAG-2.2%20AA-brightgreen)](https://www.w3.org/WAI/WCAG22/Understanding/)

## ✨ Features

### 🎯 Core Functionality
- **10 Nonprofit-Specific Scenarios**: Carefully crafted trolley problems addressing AI ethics in food banks, homeless services, mental health, donor engagement, and more
- **Real-time Multiplayer**: Up to 200 participants can join simultaneously with live vote tracking
- **Facilitator Dashboard**: Complete session management with QR codes, timer controls, and analytics
- **Word Cloud Visualizations**: Dynamic D3.js word clouds from participant rationales
- **Demo Mode**: Fully functional offline mode with mock data for testing

### 🛡️ Ethics & Safety
- **Content Moderation**: Automatic profanity filtering and PII detection
- **Accessibility First**: WCAG 2.2 AA compliant with screen reader support
- **Privacy Protection**: Secure fingerprinting without personal data collection
- **Rate Limiting**: Prevents spam and ensures fair participation

### 🚀 Technical Excellence
- **TypeScript**: Full type safety across frontend and backend
- **Real-time Updates**: Supabase realtime subscriptions for live collaboration
- **Responsive Design**: Mobile-first design that works on all devices
- **Performance Optimized**: Lighthouse score optimized with lazy loading
- **CI/CD Ready**: GitHub Actions workflow for automated testing and deployment

## 🎲 Example Scenarios

### 🍞 Food Bank Resource Allocation
*Your food bank could serve 2,000 more families with AI optimization, but might exclude 200-300 irregular users who need help most.*

### 🧠 Youth Mental Health Screening  
*AI could identify 500 more at-risk youth, but has 2% false positive rate that could traumatize healthy teens.*

### 💰 Donor Targeting
*AI donor analysis could increase funding by $300K, but might alienate 2,000 grassroots supporters.*

[View all 10 scenarios →](./docs/scenarios/)

## 🎯 Use Cases

### 🏫 **Educational Settings**
- **Nonprofit Leadership Programs**: Ethics training for executive directors
- **University Courses**: Social work, public administration, business ethics
- **Professional Development**: Staff training on AI implementation

### 🤝 **Organizational Training**
- **Board Retreats**: Governance discussions about AI adoption
- **Staff Workshops**: Team alignment on ethical technology use
- **Funder Education**: Foundation staff exploring AI grant implications

### 🌐 **Community Engagement**
- **Conference Workshops**: Interactive sessions at nonprofit conferences  
- **Webinar Activities**: Engaging remote audiences in ethics discussions
- **Community Forums**: Public dialogue about AI in social services

## 🚀 Quick Start

### Option 1: One-Click Deploy
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/joshuamtm/nonprofit-trolley-game)

### Option 2: Manual Setup

#### Prerequisites
- Node.js 18+
- A Supabase account
- Netlify account (for deployment)

#### 1. Clone and Install
```bash
git clone https://github.com/joshuamtm/nonprofit-trolley-game.git
cd nonprofit-trolley-game
cd client
npm install
```

#### 2. Set up Supabase
1. Create a new Supabase project
2. In SQL Editor, run the schema from [`supabase-schema.sql`](./supabase-schema.sql)
3. Get your Project URL and anon public key

#### 3. Configure Environment
```bash
# Copy environment template
cp .env.example .env.local

# Edit with your Supabase credentials
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_ENVIRONMENT=production
```

#### 4. Run Development Server
```bash
npm start
```

Visit `http://localhost:3000` to see the app running!

## 🏗️ Architecture

```
nonprofit-trolley-game/
├── client/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API and database services
│   │   ├── stores/         # Zustand state management
│   │   ├── utils/          # Text processing, fingerprinting
│   │   └── hooks/          # Accessibility and UX hooks
│   └── public/            # Static assets
├── docs/                  # Documentation and scenarios
├── schemas/               # JSON schemas for validation  
├── sql/                   # Database migrations
└── netlify.toml          # Deployment configuration
```

### 🔧 Tech Stack
- **Frontend**: React 18, TypeScript, Zustand, D3.js
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **Deployment**: Netlify with GitHub Actions CI/CD
- **Styling**: CSS Modules with accessibility focus
- **Testing**: Jest, React Testing Library

## 📊 Database Schema

The application uses 6 main tables:
- `sessions` - Game rooms with configuration
- `participants` - Anonymous user tracking via fingerprints
- `scenarios` - The 10 nonprofit ethics scenarios
- `votes` - Participant decisions (pull/don't pull)
- `rationales` - Optional text explanations for votes
- `session_scenarios` - Tracks scenario progression in sessions

[View complete schema →](./sql/migrations/001_initial_schema.sql)

## 🎮 How to Play

### For Facilitators
1. **Create Room**: Set timer duration, participant limits, and moderation settings
2. **Share Access**: Display QR code or share join link with participants
3. **Guide Discussion**: Present scenarios and facilitate ethical discussions
4. **Review Results**: Analyze voting patterns and word clouds

### For Participants  
1. **Join Room**: Scan QR code or enter room code
2. **Read Scenario**: Consider the ethical dilemma presented
3. **Make Decision**: Vote "Pull Lever" or "Don't Pull Lever"
4. **Add Rationale**: Optionally explain your reasoning
5. **Discuss Results**: Engage in group discussion about outcomes

## 🌟 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Install dependencies
npm install

# Run tests
npm test

# Run accessibility audit
npm run lighthouse

# Type checking
npm run typecheck
```

### 📝 Adding New Scenarios
1. Follow the [scenario schema](./schemas/scenario.schema.json)
2. Add to [`supabase-schema.sql`](./supabase-schema.sql)  
3. Test with various user groups
4. Consider accessibility and cultural sensitivity

## 📈 Usage Analytics

The application tracks anonymous usage metrics:
- Session duration and participant counts
- Vote distributions and response times
- Word cloud themes and frequency
- Accessibility feature usage

No personal information is collected or stored.

## 🔒 Privacy & Security

- **No Personal Data**: Only anonymous fingerprints stored
- **Content Moderation**: Automatic filtering of inappropriate content
- **PII Protection**: Personal information automatically redacted
- **Rate Limiting**: Prevents spam and abuse
- **HTTPS Only**: All data transmitted securely

## 🎯 Roadmap

### Version 2.0
- [ ] Custom scenario builder for organizations
- [ ] Expanded analytics dashboard for facilitators
- [ ] Multi-language support (Spanish, French)
- [ ] Integration with LMS platforms (Canvas, Moodle)

### Version 3.0
- [ ] AI-powered scenario generation
- [ ] Advanced accessibility features (voice controls)
- [ ] Mobile app for iOS/Android
- [ ] Blockchain-based voting verification

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **AI21 Labs** for inspiration on AI ethics education
- **Trolley Problem**: Classic philosophical thought experiment by Philippa Foot
- **Nonprofit Sector**: Organizations working to make the world better
- **Accessibility Community**: Guidance on inclusive design practices

## 📞 Support

- 📧 **Email**: [support@joshuamtm.com](mailto:support@joshuamtm.com)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/joshuamtm/nonprofit-trolley-game/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/joshuamtm/nonprofit-trolley-game/discussions)
- 📖 **Documentation**: [docs/](./docs/)

## ⭐ Show Your Support

If this project helps your organization explore AI ethics, please consider:
- ⭐ Starring this repository
- 🔗 Sharing with your network
- 🐛 Reporting bugs or suggesting features
- 💝 Contributing improvements

---

<div align="center">
<strong>Built with ❤️ for the nonprofit sector</strong><br>
🤖 Generated with <a href="https://claude.ai/code">Claude Code</a>
</div>