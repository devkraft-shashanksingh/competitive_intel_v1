import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Sparkles, Plus, X, Edit2, Check, Trash2, Lightbulb, Wand2, ArrowLeft } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const InterestManager = ({ onBack }) => {
    const [interests, setInterests] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newInterest, setNewInterest] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [manualSuggestions, setManualSuggestions] = useState([]);
    const [suggesting, setSuggesting] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        fetchInterests();
    }, []);

    const fetchInterests = async () => {
        try {
            const response = await axios.get('http://localhost:3001/api/interests');
            setInterests(response.data.interests || []);
            setSuggestions(response.data.suggestions || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching interests:', error);
            setLoading(false);
        }
    };

    const handleAcceptSuggestion = async (suggestion) => {
        try {
            const response = await axios.post('http://localhost:3001/api/interests', {
                topic: suggestion.topic,
                category: suggestion.category,
                smartTag: suggestion.smartTag,
                badgeTag: suggestion.badgeTag,
                description: suggestion.description,
                source: 'suggested'
            });

            setInterests([...interests, response.data]); // Update local state immediately
            setSuggestions(suggestions.filter(s => s.id !== suggestion.id));
            showToast(`Added interest: ${suggestion.description}`);
            // fetchInterests(); // No longer needed for immediate feedback
        } catch (error) {
            console.error('Error accepting suggestion:', error);
            showToast('Failed to add interest');
        }
    };

    const handleDismissSuggestion = async (id) => {
        try {
            await axios.delete(`http://localhost:3001/api/interests/suggestions/${id}`);
            setSuggestions(suggestions.filter(s => s.id !== id));
            showToast('Suggestion dismissed');
        } catch (error) {
            console.error('Error dismissing suggestion:', error);
        }
    };

    const handleGetSuggestions = async (e) => {
        e.preventDefault();
        if (!newInterest.trim()) return;

        setSuggesting(true);
        setManualSuggestions([]); // Clear previous
        try {
            const response = await axios.post('http://localhost:3001/api/interests/extract', {
                prompt: newInterest,
                context: 'search',
                save: false
            });
            setManualSuggestions(response.data.suggestions || []);
            if (response.data.suggestions?.length === 0) {
                showToast("No suggestions found. Try a different term.");
            }
        } catch (error) {
            console.error('Error getting suggestions:', error);
            showToast('Failed to get suggestions');
        } finally {
            setSuggesting(false);
        }
    };

    const handleAddManualSuggestion = async (suggestion) => {
        try {
            const response = await axios.post('http://localhost:3001/api/interests', {
                topic: suggestion.topic,
                category: suggestion.category,
                smartTag: suggestion.smartTag,
                badgeTag: suggestion.badgeTag,
                description: suggestion.description,
                source: 'manual'
            });

            setManualSuggestions(manualSuggestions.filter(s => s.id !== suggestion.id));
            setInterests([...interests, response.data]); // Update local state immediately
            showToast(`Added: ${suggestion.topic}`);
        } catch (error) {
            console.error('Error adding suggestion:', error);
            showToast('Failed to add interest');
        }
    };

    const handleRemoveManualSuggestion = (id) => {
        setManualSuggestions(manualSuggestions.filter(s => s.id !== id));
    };

    const handleAddManualInterest = async (e) => {
        e.preventDefault();
        if (!newInterest.trim()) return;

        try {
            await axios.post('http://localhost:3001/api/interests', {
                topic: 'Custom',
                category: 'General',
                description: newInterest,
                source: 'manual'
            });

            setNewInterest('');
            showToast('Interest added successfully');
            fetchInterests();
        } catch (error) {
            console.error('Error adding interest:', error);
            showToast('Failed to add interest');
        }
    };

    const handleStartEdit = (interest) => {
        setEditingId(interest.id);
        setEditValue(interest.description);
    };

    const handleSaveEdit = async (id) => {
        try {
            // Optimistic update
            const updatedInterests = interests.map(i =>
                i.id === id ? { ...i, description: editValue } : i
            );
            setInterests(updatedInterests);
            setEditingId(null);
            showToast('Interest updated');

            await axios.put(`http://localhost:3001/api/interests/${id}`, {
                description: editValue
            });
        } catch (error) {
            console.error('Error updating interest:', error);
            showToast('Failed to update interest');
            fetchInterests(); // Revert on error
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditValue('');
    };

    const handleDeleteInterest = async (id) => {
        try {
            await axios.delete(`http://localhost:3001/api/interests/${id}`);
            setInterests(interests.filter(i => i.id !== id));
            showToast('Interest removed');
        } catch (error) {
            console.error('Error deleting interest:', error);
            showToast('Failed to remove interest');
        }
    };

    if (loading) {
        return (
            <div className="interest-manager-container">
                <div className="loading-spinner">Loading interests...</div>
            </div>
        );
    }

    return (
        <div className="interest-manager-container">
            <div className="interest-header">
                <div className="interest-header-content">
                    <button onClick={onBack} className="btn-back-circle" title="Back to Feed">
                        <ArrowLeft size={20} />
                    </button>
                    <Sparkles className="header-icon" size={28} />
                    <div>
                        <h2>Your Interests</h2>
                        <p>Manage your interests to get better recommendations</p>
                    </div>
                </div>
            </div>

            {/* AI Suggestions Section */}
            {suggestions.length > 0 && (
                <div className="suggestions-section">
                    <div className="section-header">
                        <Lightbulb size={20} />
                        <h3>Smart Suggestions</h3>
                        <span className="badge">{suggestions.length}</span>
                    </div>
                    <p className="section-description">
                        Based on your searches and activity, you might be interested in:
                    </p>
                    <div className="suggestions-grid">
                        {suggestions.map((suggestion) => (
                            <div key={suggestion.id} className="suggestion-card">
                                <div className="suggestion-content">
                                    <div className="suggestion-topic" style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                                        {suggestion.smartTag || suggestion.topic}
                                    </div>
                                    <div className="suggestion-description" style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
                                        {suggestion.description}
                                    </div>
                                    <div className="suggestion-meta" style={{ marginTop: '8px' }}>
                                        <span className="category-badge" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px' }}>
                                            ✨ {suggestion.badgeTag || suggestion.category}
                                        </span>
                                        <span className="confidence-badge">
                                            {Math.round(suggestion.confidence * 100)}% match
                                        </span>
                                    </div>
                                </div>
                                <div className="suggestion-actions">
                                    <button
                                        onClick={() => handleAcceptSuggestion(suggestion)}
                                        className="btn-accept"
                                        title="Accept suggestion"
                                    >
                                        <Check size={16} />
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleDismissSuggestion(suggestion.id)}
                                        className="btn-dismiss"
                                        title="Dismiss suggestion"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Manual Interest Input */}
            {/* Manual Interest Input */}
            <div className="add-interest-section">
                <h3>Add AI powered interests</h3>
                <div className="add-interest-form">
                    <div className="input-wrapper">
                        <Plus size={18} className="input-icon" />
                        <input
                            type="text"
                            value={newInterest}
                            onChange={(e) => setNewInterest(e.target.value)}
                            placeholder="e.g., Clinical trials in Cardiology, FDA approvals..."
                            className="interest-input"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleGetSuggestions(e);
                                }
                            }}
                        />
                    </div>
                    <button
                        onClick={handleGetSuggestions}
                        className="btn-add"
                        disabled={!newInterest.trim() || suggesting}
                        title="Get AI Suggestions"
                    >
                        {suggesting ? <Sparkles className="spin" size={18} /> : <Wand2 size={18} />}
                        Fetch Interest
                    </button>
                </div>

                {/* Manual Suggestions List */}
                {manualSuggestions.length > 0 && (
                    <div className="manual-suggestions">
                        <p className="suggestions-label">Did you mean?</p>
                        <div className="manual-suggestions-list">
                            {manualSuggestions.map(s => (
                                <div key={s.id} className="manual-suggestion-item">
                                    <div className="ms-content">
                                        <span className="ms-topic">{s.topic}</span>
                                        <span className="ms-desc">{s.description}</span>
                                    </div>
                                    <div className="ms-actions">
                                        <button
                                            onClick={() => handleAddManualSuggestion(s)}
                                            className="btn-ms-add"
                                        >
                                            Add
                                        </button>
                                        <button
                                            onClick={() => handleRemoveManualSuggestion(s.id)}
                                            className="btn-ms-edit"
                                            title="Does not look right? Remove it"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Saved Interests */}
            <div className="saved-interests-section">
                <div className="section-header">
                    <h3>Your Saved Interests</h3>
                    <span className="badge">{interests.length}</span>
                </div>
                {interests.length === 0 ? (
                    <div className="empty-state">
                        <Sparkles size={48} className="empty-icon" />
                        <p>No interests yet. Add some to get personalized recommendations!</p>
                    </div>
                ) : (
                    <div className="interests-list">
                        {interests.map((interest) => (
                            <div key={interest.id} className="interest-item">
                                {editingId === interest.id ? (
                                    <div className="interest-edit-mode">
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="edit-input"
                                            autoFocus
                                        />
                                        <div className="edit-actions">
                                            <button
                                                onClick={() => handleSaveEdit(interest.id)}
                                                className="btn-save"
                                                title="Save"
                                            >
                                                <Check size={16} />
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="btn-cancel"
                                                title="Cancel"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="interest-content">
                                            <div className="interest-topic" style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                                                {interest.smartTag || interest.topic || interest.category}
                                            </div>
                                            <div className="interest-description" style={{ fontSize: '13px', color: '#64748b' }}>
                                                {interest.description}
                                            </div>
                                            <div className="interest-meta" style={{ marginTop: '8px' }}>
                                                <span className="category-badge" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px' }}>
                                                    ✨ {interest.badgeTag || interest.category}
                                                </span>
                                                {interest.source === 'suggested' && (
                                                    <span className="source-badge">
                                                        <Sparkles size={12} /> AI Suggested
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="interest-actions">
                                            <button
                                                onClick={() => handleStartEdit(interest)}
                                                className="btn-icon"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteInterest(interest.id)}
                                                className="btn-icon btn-delete"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InterestManager;
