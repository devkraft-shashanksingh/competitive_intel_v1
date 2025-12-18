
import React from 'react';
import { ThumbsUp, ThumbsDown, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import API_BASE_URL from '../config';

const ArticleCard = ({ article, onVote, onTagClick }) => {
    const { addToast } = useToast();

    const handleVote = async (type) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/vote`, {
                link: article.link,
                type,
                title: article.title
            });
            onVote(article.link, response.data);
            addToast(type === 'up' ? 'Upvoted!' : 'Downvoted!');

            // Trigger interest extraction on upvote
            if (type === 'up') {
                try {
                    await axios.post(`${API_BASE_URL}/api/interests/extract`, {
                        prompt: article.title,
                        context: 'upvote'
                    });
                } catch (err) {
                    console.error('Error extracting interest from upvote:', err);
                }
            }
        } catch (error) {
            console.error('Error voting:', error);
            addToast('Failed to vote. Try again.');
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h2>
                    <a href={article.link} target="_blank" rel="noopener noreferrer" className="article-title-link">
                        {article.title}
                    </a>
                </h2>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="star-btn-group">
                        <button
                            className="star-btn"
                            onClick={() => handleVote('up')}
                            title="Upvote"
                            aria-label="Upvote"
                        >
                            <ThumbsUp size={14} />
                        </button>
                        <div className="vote-count-box">
                            {article.votes?.up || 0}
                        </div>
                    </div>

                    <div className="star-btn-group">
                        <button
                            className="star-btn"
                            onClick={() => handleVote('down')}
                            title="Downvote"
                            aria-label="Downvote"
                        >
                            <ThumbsDown size={14} />
                        </button>
                        <div className="vote-count-box">
                            {article.votes?.down || 0}
                        </div>
                    </div>
                </div>
            </div>

            <div className="card-summary">
                {article.smartTag && (
                    <div style={{ marginBottom: '12px', display: 'flex' }}>
                        <div
                            className="smart-tag-badge"
                            onClick={() => onTagClick && onTagClick(article.smartTag)}
                            title={`Filter by: ${article.smartTag}`}
                            style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 6px rgba(102, 126, 234, 0.25)',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 12px rgba(102, 126, 234, 0.4)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(102, 126, 234, 0.25)';
                            }}
                        >
                            <span>✨</span>
                            {article.smartTag}
                        </div>
                    </div>
                )}
                {article.reason && !article.smartTag && (
                    <div className="ai-reason-box">
                        <strong>AI Match:</strong> {article.reason}
                    </div>
                )}
                {article.contentSnippet || article.summary}
            </div>

            <div className="card-footer">
                <div className="footer-item">
                    <span className="language-circle" style={{ backgroundColor: '#2b7489' }}></span>
                    <span>{article.creator || 'Unknown'}</span>
                </div>

                <div className="footer-item" style={{ marginLeft: 'auto' }}>
                    <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="read-more-link"
                    >
                        Read <ExternalLink size={12} />
                    </a>
                </div>
            </div>
        </div>
    );
};

export default ArticleCard;
