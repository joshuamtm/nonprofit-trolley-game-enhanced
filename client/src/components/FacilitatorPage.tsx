import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { useGameStore } from '../stores/gameStore';
import { RoomService } from '../services/rooms';
import { MockRoomService, isMockMode } from '../services/mockData';
import './FacilitatorPage.css';

const FacilitatorPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading, error, createRoom, setError } = useGameStore();
  const [config, setConfig] = useState({
    maxParticipants: 200,
    moderationEnabled: true,
    contentWarnings: true,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleCreateRoom = async () => {
    setError(null);
    await createRoom(config);
  };

  useEffect(() => {
    if (session && !error) {
      navigate(`/room/${session.room_code}?role=facilitator`);
    }
  }, [session, error, navigate]);

  const joinUrl = session 
    ? `${window.location.origin}/join/${session.room_code}`
    : '';

  return (
    <div className="facilitator-page">
      <div className="header">
        <h1>Create a New Session</h1>
        <p>Set up your trolley game room and invite participants</p>
      </div>

      {!session ? (
        <div className="setup-form">
          <div className="form-section">
            <h2>Room Configuration</h2>
            
            <div className="form-group">
              <label htmlFor="maxParticipants">
                Maximum Participants
              </label>
              <select
                id="maxParticipants"
                value={config.maxParticipants}
                onChange={(e) => setConfig({
                  ...config,
                  maxParticipants: parseInt(e.target.value)
                })}
              >
                <option value={50}>50 participants</option>
                <option value={100}>100 participants</option>
                <option value={200}>200 participants (recommended)</option>
                <option value={500}>500 participants (advanced)</option>
              </select>
            </div>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.moderationEnabled}
                  onChange={(e) => setConfig({
                    ...config,
                    moderationEnabled: e.target.checked
                  })}
                />
                Enable content moderation
              </label>
              <p className="help-text">
                Filters profanity and inappropriate content automatically
              </p>
            </div>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.contentWarnings}
                  onChange={(e) => setConfig({
                    ...config,
                    contentWarnings: e.target.checked
                  })}
                />
                Show content warnings
              </label>
              <p className="help-text">
                Display warnings for scenarios with sensitive topics
              </p>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              className="create-button"
              onClick={handleCreateRoom}
              disabled={loading}
            >
              {loading ? 'Creating Room...' : 'Create Room'}
            </button>
          </div>

          {isMockMode && (
            <div className="demo-notice">
              <h3>🚧 Demo Mode</h3>
              <p>
                Running in demonstration mode. In production, this would connect 
                to your Supabase database for real-time functionality.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="room-created">
          <div className="room-info">
            <h2>Room Created!</h2>
            <div className="room-code-display">
              <span className="room-code">{session.room_code}</span>
            </div>
            
            <div className="qr-section">
              <h3>Participant QR Code</h3>
              <div className="qr-container">
                <QRCode 
                  value={joinUrl}
                  size={256}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <p className="join-url">{joinUrl}</p>
            </div>

            <div className="room-stats">
              <div className="stat">
                <span className="stat-label">Participants:</span>
                <span className="stat-value">0</span>
              </div>
              <div className="stat">
                <span className="stat-label">Status:</span>
                <span className="stat-value">Waiting</span>
              </div>
            </div>

            <div className="action-buttons">
              <button
                className="enter-room-button"
                onClick={() => navigate(`/room/${session.room_code}?role=facilitator`)}
              >
                Enter Room
              </button>
              
              <button
                className="copy-link-button"
                onClick={() => navigator.clipboard.writeText(joinUrl)}
              >
                Copy Join Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilitatorPage;