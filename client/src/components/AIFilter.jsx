import React, { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

const AIFilter = ({ onAnalyze, isAnalyzing }) => {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (prompt.trim()) {
            onAnalyze(prompt);
        }
    };

    return (
        <div className="ai-filter-container">
            <form onSubmit={handleSubmit} className="ai-input-wrapper">
                <div className="ai-icon">
                    <Sparkles size={18} color="#8b949e" />
                </div>
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you're looking for (e.g., 'Latest mergers in oncology')..."
                    className="ai-input"
                    disabled={isAnalyzing}
                />
                <button
                    type="submit"
                    className="ai-submit-btn"
                    disabled={!prompt.trim() || isAnalyzing}
                >
                    {isAnalyzing ? 'Analyzing...' : 'Ask AI'}
                    {!isAnalyzing && <ArrowRight size={16} />}
                </button>
            </form>
        </div>
    );
};

export default AIFilter;
