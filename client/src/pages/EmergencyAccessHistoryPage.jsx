/**
 * Emergency Access History Page
 * Patient-facing audit trail showing who accessed their emergency profile and when
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, Check, Clock, X as XIcon } from 'lucide-react';
import '../styles/EmergencyAccessHistory.css';

const EmergencyAccessHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const patientId = localStorage.getItem('patientId');

  useEffect(() => {
    fetchAccessHistory();
  }, []);

  const fetchAccessHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      const res = await axios.get(`/api/v1/emergency/access-history/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setHistory(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch access history:', err);
      setError(err.response?.data?.message || 'Failed to load access history');
    } finally {
      setLoading(false);
    }
  };

  const getAccessReasonDisplay = (reason) => {
    return reason
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'authorized':
        return 'authorized';
      case 'requested':
        return 'requested';
      case 'expired':
        return 'expired';
      case 'revoked':
        return 'revoked';
      default:
        return 'default';
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = (expirationTime) => {
    const now = new Date();
    const expiration = new Date(expirationTime);
    const diff = expiration - now;

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return `${minutes}m remaining`;
  };

  const filteredHistory = history.filter(item => {
    if (filter === 'all') return true;
    return item.authorizationStatus === filter;
  });

  if (loading) {
    return (
      <div className="access-history-container loading">
        <div className="loading-message">Loading access history...</div>
      </div>
    );
  }

  return (
    <div className="access-history-container">
      <div className="history-header">
        <h1>Emergency Access History</h1>
        <p className="subtitle">
          See who accessed your emergency information and when. This audit trail helps you
          maintain control over your medical data.
        </p>
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-icon"><AlertCircle size={24} className="text-red-600" /></div>
          <div className="error-text">{error}</div>
        </div>
      )}

      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-label">Filter by Status:</div>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({history.length})
          </button>
          <button
            className={`filter-btn ${filter === 'authorized' ? 'active' : ''}`}
            onClick={() => setFilter('authorized')}
          >
            Authorized ({history.filter(h => h.authorizationStatus === 'authorized').length})
          </button>
          <button
            className={`filter-btn ${filter === 'expired' ? 'active' : ''}`}
            onClick={() => setFilter('expired')}
          >
            Expired ({history.filter(h => h.authorizationStatus === 'expired').length})
          </button>
          <button
            className={`filter-btn ${filter === 'requested' ? 'active' : ''}`}
            onClick={() => setFilter('requested')}
          >
            Pending ({history.filter(h => h.authorizationStatus === 'requested').length})
          </button>
        </div>
      </div>

      {/* Access History List */}
      <div className="history-list">
        {filteredHistory.length > 0 ? (
          filteredHistory.map(access => (
            <div
              key={access._id}
              className={`history-item ${getStatusColor(access.authorizationStatus)}`}
            >
              <div
                className="item-header"
                onClick={() =>
                  setExpandedId(expandedId === access._id ? null : access._id)
                }
              >
                <div className="header-left">
                  <div className="access-icon">
                    {access.authorizationStatus === 'authorized' && <Check size={24} className="text-green-600" />}
                    {access.authorizationStatus === 'requested' && <Clock size={24} className="text-yellow-600" />}
                    {access.authorizationStatus === 'expired' && <Clock size={24} className="text-gray-400" />}
                    {access.authorizationStatus === 'revoked' && <XIcon size={24} className="text-red-600" />}
                  </div>

                  <div className="header-info">
                    <div className="access-reason">
                      {getAccessReasonDisplay(access.accessReason)}
                    </div>
                    <div className="access-time">
                      Requested:{' '}
                      {formatDateTime(access.requestDateTime)}
                    </div>
                  </div>
                </div>

                <div className="header-right">
                  <span
                    className={`status-badge ${access.authorizationStatus}`}
                  >
                    {access.authorizationStatus.toUpperCase()}
                  </span>
                  {access.authorizationStatus === 'authorized' && (
                    <span className="time-badge">
                      {getTimeRemaining(access.accessExpirationDateTime)}
                    </span>
                  )}
                  <span className="expand-icon">
                    {expandedId === access._id ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {expandedId === access._id && (
                <div className="item-details">
                  <div className="details-grid">
                    <div className="detail-column">
                      <div className="detail-item">
                        <span className="detail-label">Professional:</span>
                        <span className="detail-value">
                          {access.professionalId?.profile?.firstName || 'Unknown'} (
                          {access.professionalRole})
                        </span>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">Facility:</span>
                        <span className="detail-value">
                          {access.facilityId?.name || 'Not specified'}
                        </span>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">Access Level:</span>
                        <span className="detail-value">
                          {access.accessLevel?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="detail-column">
                      <div className="detail-item">
                        <span className="detail-label">Access ID:</span>
                        <span className="detail-value monospace">{access.accessId}</span>
                      </div>

                      {access.authorizationDateTime && (
                        <div className="detail-item">
                          <span className="detail-label">Authorized:</span>
                          <span className="detail-value">
                            {formatDateTime(access.authorizationDateTime)}
                          </span>
                        </div>
                      )}

                      {access.accessExpirationDateTime && (
                        <div className="detail-item">
                          <span className="detail-label">Expires:</span>
                          <span className="detail-value">
                            {formatDateTime(access.accessExpirationDateTime)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {access.reasonDescription && (
                    <div className="reason-section">
                      <span className="detail-label">Access Reason Details:</span>
                      <p className="reason-text">{access.reasonDescription}</p>
                    </div>
                  )}

                  <div className="privacy-note">
                    <strong>Privacy Note:</strong> This emergency access was logged and audited.
                    If you believe this access was unauthorized, please contact support
                    immediately.
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-history">
            <div className="no-history-icon"><AlertCircle size={48} className="text-gray-300" /></div>
            <div className="no-history-text">
              {filter === 'all'
                ? 'No emergency access history yet.'
                : `No ${filter} access requests.`}
            </div>
            <p className="no-history-subtitle">
              Your emergency access history will appear here as healthcare professionals access
              your emergency profile in emergency situations.
            </p>
          </div>
        )}
      </div>

      {/* Information Section */}
      <div className="info-section">
        <h2>Understanding Your Emergency Access History</h2>

        <div className="info-grid">
          <div className="info-card">
            <div className="info-icon"><Check size={32} className="text-green-600" /></div>
            <div className="info-content">
              <h3>Authorized Access</h3>
              <p>
                A healthcare professional has been granted temporary access to your emergency
                profile. The access expires after a fixed duration.
              </p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon"><Clock size={32} className="text-yellow-600" /></div>
            <div className="info-content">
              <h3>Pending Request</h3>
              <p>
                An emergency access request has been submitted but not yet authorized by an
                administrator.
              </p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon"><Clock size={32} className="text-gray-400" /></div>
            <div className="info-content">
              <h3>Expired Access</h3>
              <p>
                The temporary emergency access window has closed. Further access would require a
                new authorization.
              </p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon"><XIcon size={32} className="text-red-600" /></div>
            <div className="info-content">
              <h3>Revoked Access</h3>
              <p>
                The emergency access was manually revoked before its expiration time.
              </p>
            </div>
          </div>
        </div>

        <div className="privacy-info">
          <h3>Your Privacy</h3>
          <ul>
            <li>Emergency contacts do NOT automatically have access to your medical records</li>
            <li>Emergency access is time-limited and must be explicitly authorized</li>
            <li>Patient-reported information is clearly marked as unverified</li>
            <li>All emergency access is logged for your auditing and our compliance</li>
            <li>
              You can contact support if you see any unauthorized or suspicious emergency access
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmergencyAccessHistoryPage;
