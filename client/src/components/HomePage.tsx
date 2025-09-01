import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <header className="hero-section">
        <h1>Nonprofit Trolley Game</h1>
        <p className="tagline">
          Explore AI ethics in nonprofits through interactive scenarios
        </p>
        <p className="description">
          A real-time multiplayer game designed to facilitate meaningful discussions 
          about artificial intelligence ethics in nonprofit organizations.
        </p>
      </header>

      <div className="action-cards">
        <div className="card facilitator-card">
          <h2>🎯 For Facilitators</h2>
          <p>
            Create a room, select scenarios, and guide your group through 
            ethical decision-making exercises.
          </p>
          <Link to="/facilitator" className="cta-button primary">
            Create Room
          </Link>
        </div>

        <div className="card participant-card">
          <h2>📱 Join a Game</h2>
          <p>
            Scan a QR code or enter a room code to participate in an 
            ethics discussion with your group.
          </p>
          <Link to="/join" className="cta-button secondary">
            Join Room
          </Link>
        </div>
      </div>

      <div className="features">
        <h2>How It Works</h2>
        <div className="feature-grid">
          <div className="feature">
            <div className="feature-icon">⏱️</div>
            <h3>Timed Decisions</h3>
            <p>30-second rounds encourage quick, intuitive responses</p>
          </div>
          
          <div className="feature">
            <div className="feature-icon">💭</div>
            <h3>Share Reasoning</h3>
            <p>Add brief rationales to explain your choices</p>
          </div>
          
          <div className="feature">
            <div className="feature-icon">☁️</div>
            <h3>Word Clouds</h3>
            <p>See everyone's reasoning visualized in real-time</p>
          </div>
          
          <div className="feature">
            <div className="feature-icon">🚂</div>
            <h3>Visual Results</h3>
            <p>Watch the trolley move based on group decisions</p>
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>
          Built for nonprofit organizations to explore AI ethics thoughtfully and collaboratively.
        </p>
      </footer>
    </div>
  );
};

export default HomePage;