import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Edit2, Sparkles, ExternalLink, Loader, RefreshCw, Bookmark } from 'lucide-react';

const WeeklyUpdate = ({ onBack }) => {
    const [loading, setLoading] = useState(true);
    const [updates, setUpdates] = useState([]);
    const [editingInterestId, setEditingInterestId] = useState(null);
    const [regeneratingId, setRegeneratingId] = useState(null); // Add this
    const [editForm, setEditForm] = useState({ topic: '', customPrompt: '' });

    useEffect(() => {
        fetchUpdates();
    }, []);

    const fetchUpdates = async () => {
        setLoading(true);
        try {
            const response = await axios.get('http://localhost:3001/api/weekly-update');
            setUpdates(response.data.updates || []);
        } catch (error) {
            console.error('Error fetching weekly updates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditInterest = (group) => {
        setEditingInterestId(group.interestId);
        setEditForm({
            topic: group.interest,
            customPrompt: group.customPrompt || "I am a weekly content summarizer focused on your interests. For each article, I provide a clear bullet-point summary highlighting the key insights, along with a direct option to navigate to the full article. Additionally, I include a dedicated section explaining how the article relates to your prompt or area of interest, helping you quickly assess its relevance."
        });
    };

    const handleCancelEdit = () => {
        setEditingInterestId(null);
        setEditForm({ topic: '', customPrompt: '' });
    };

    const handleSaveInterest = async (interestId) => {
        setRegeneratingId(interestId); // Start loading UI
        setEditingInterestId(null); // Close edit form

        try {
            // 1. Update the interest settings (prompt)
            await axios.put(`http://localhost:3001/api/interests/${interestId}`, {
                topic: editForm.topic,
                customPrompt: editForm.customPrompt
            });

            // 2. Regenerate specifically for this interest
            const response = await axios.post(`http://localhost:3001/api/weekly-update/${interestId}/regenerate`);

            if (response.data.update) {
                // 3. Update local state with new data for this interest only
                setUpdates(prevUpdates => prevUpdates.map(u =>
                    u.interestId === interestId ? response.data.update : u
                ));
            } else {
                console.log("No updates found for this interest during regeneration");
            }

        } catch (error) {
            console.error('Error updating interest:', error);
        } finally {
            setRegeneratingId(null); // Stop loading UI
        }
    };

    return (
        <div className="weekly-update-container animate-fade-in">
            {/* Header */}
            <div className="interest-header">
                <div className="interest-header-content">
                    <button onClick={onBack} className="btn-back-circle" title="Back to Feed">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2>Weekly Update</h2>
                        <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '14px', color: 'white' }}>
                            AI-curated insights based on your unique interest personas
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="loading-state">
                    <Loader className="spin" size={32} />
                    <h3>Generating personalized insights...</h3>
                    <p>Analyzing articles based on your unique interest personas.</p>
                </div>
            ) : updates.length === 0 ? (
                <div className="empty-state">
                    <Bookmark size={48} />
                    <h3>No updates found</h3>
                    <p>Add more interests to get personalized weekly summaries.</p>
                </div>
            ) : (
                <div className="updates-grid">
                    {updates.map((group) => (
                        <div key={group.interestId} className="interest-group" style={{ position: 'relative' }}>
                            {/* Overlay Loader for Regenerating */}
                            {regeneratingId === group.interestId && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'rgba(255, 255, 255, 0.85)',
                                    zIndex: 10,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '16px',
                                    backdropFilter: 'blur(4px)'
                                }}>
                                    <Loader className="spin" size={32} color="#4f46e5" />
                                    <p style={{ marginTop: '12px', fontWeight: '500', color: '#333' }}>Regenerating with new persona...</p>
                                </div>
                            )}

                            {editingInterestId === group.interestId ? (
                                <div className="interest-edit-form prompt-section">
                                    <h3 className="edit-form-title">Edit Persona</h3>
                                    <div className="edit-form-group">
                                        <label>Interest Topic</label>
                                        <input
                                            type="text"
                                            value={editForm.topic}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, topic: e.target.value }))}
                                            className="prompt-input"
                                        />
                                    </div>
                                    <div className="edit-form-group">
                                        <label>AI Prompt</label>
                                        <textarea
                                            value={editForm.customPrompt}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, customPrompt: e.target.value }))}
                                            className="prompt-textarea"
                                            rows={3}
                                            placeholder="E.g., Summarize like a tech analyst..."
                                        />
                                    </div>
                                    <div className="prompt-actions">
                                        <button onClick={handleCancelEdit} className="cancel-btn">Cancel</button>
                                        <button onClick={() => handleSaveInterest(group.interestId)} className="save-btn">
                                            <RefreshCw size={14} /> Save & Regenerate
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="interest-group-header">
                                    <h2 className="interest-group-title">
                                        <span className="highlight-bar"></span>
                                        {group.interest}
                                    </h2>
                                    <button
                                        onClick={() => handleEditInterest(group)}
                                        className="edit-prompt-btn"
                                        title="Edit Prompt"
                                    >
                                        <Edit2 size={14} /> Edit Prompt
                                    </button>
                                </div>
                            )}

                            <div className="articles-column">
                                {group.articles.map((article, idx) => (
                                    <div key={idx} className="summary-card">
                                        <div className="summary-header">
                                            <h3 className="article-title">{article.title}</h3>
                                            {article.date && !isNaN(new Date(article.date).getTime()) && (
                                                <span className="article-date">
                                                    {new Date(article.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            )}
                                        </div>

                                        <div className="summary-content">
                                            <div className="bullet-points">
                                                <h4>Key Takeaways</h4>
                                                <ul>
                                                    {Array.isArray(article.summary) ? (
                                                        article.summary.map((point, i) => (
                                                            <li key={i}>{point}</li>
                                                        ))
                                                    ) : (
                                                        <li>{article.summary}</li>
                                                    )}
                                                </ul>
                                            </div>

                                            {article.relevance && (
                                                <div className="relevance-box">
                                                    <h4>Why this matters</h4>
                                                    <p>{article.relevance}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="summary-footer">
                                            {article.creator && (
                                                <div className="source-info">
                                                    <span className="source-dot"></span>
                                                    {article.creator}
                                                </div>
                                            )}
                                            <a
                                                href={article.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="read-full-btn"
                                            >
                                                Read Full Article <ExternalLink size={14} />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WeeklyUpdate;
