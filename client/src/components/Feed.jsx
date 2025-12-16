import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ArticleCard from './ArticleCard';
import SkeletonCard from './SkeletonCard';
import AIFilter from './AIFilter';
import ProgressSteps from './ProgressSteps';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';

const Feed = ({ category, setCategory }) => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // AI State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStep, setAnalysisStep] = useState(0);
    const [shortlistedArticles, setShortlistedArticles] = useState([]);
    const [viewMode, setViewMode] = useState('all'); // 'all' | 'shortlisted'
    const [aiPrompt, setAiPrompt] = useState('');
    const [recommendationMetadata, setRecommendationMetadata] = useState(null);
    const [activeTag, setActiveTag] = useState(null);

    useEffect(() => {
        setPage(1);
        setViewMode('all');
        setShortlistedArticles([]);
    }, [category]);

    useEffect(() => {
        if (viewMode === 'all') {
            fetchArticles(page, category);
        }
    }, [page, category, viewMode]);

    const fetchArticles = async (pageNum, cat) => {
        setLoading(true);

        // Reset AI state when switching categories
        if (cat !== 'recommendations') {
            setIsAnalyzing(false);
            setViewMode('all');
        }

        try {
            if (cat === 'recommendations') {
                setIsAnalyzing(true);
                setAnalysisStep(0); // Fetching

                // Simulate steps
                setTimeout(() => setAnalysisStep(1), 800); // Analyzing

                const response = await axios.get('http://localhost:3001/api/recommendations');

                setAnalysisStep(2); // Recommending
                setTimeout(() => {
                    setShortlistedArticles(response.data.matches);
                    setRecommendationMetadata(response.data.metadata);
                    setViewMode('shortlisted');
                    setIsAnalyzing(false);

                    // Build dynamic prompt text
                    const meta = response.data.metadata;
                    if (meta) {
                        setAiPrompt(`Based on ${meta.basedOnUpvotes} upvotes and ${meta.basedOnSearches} searches`);
                    } else {
                        setAiPrompt('Based on your upvotes and search history');
                    }
                }, 800);

                setLoading(false);
            } else {
                const response = await axios.get(`http://localhost:3001/api/pharma-feed?page=${pageNum}&limit=10&category=${cat}`);
                if (Array.isArray(response.data)) {
                    setArticles(response.data);
                    setTotalPages(1);
                } else {
                    setArticles(response.data.items);
                    setTotalPages(response.data.totalPages);
                }
                setLoading(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err) {
            console.error('Error fetching feed:', err);
            setError('Failed to load articles. Please check if the backend is running.');
            setLoading(false);
            setIsAnalyzing(false);
        }
    };

    const handleAnalyze = async (prompt) => {
        setIsAnalyzing(true);
        setAiPrompt(prompt);
        setAnalysisStep(0); // Fetching

        try {
            // Simulate steps for better UX
            setTimeout(() => setAnalysisStep(1), 1000); // Analyzing

            const response = await axios.post('http://localhost:3001/api/ai-filter', {
                prompt,
                category
            });

            setAnalysisStep(2); // Shortlisting
            setTimeout(() => {
                setShortlistedArticles(response.data.matches);
                setViewMode('shortlisted');
                setIsAnalyzing(false);
            }, 800);

            // Trigger interest extraction in background
            try {
                await axios.post('http://localhost:3001/api/interests/extract', {
                    prompt,
                    context: 'search'
                });
            } catch (err) {
                console.error('Error extracting interests:', err);
                // Don't block the main flow if interest extraction fails
            }

        } catch (err) {
            console.error('Error analyzing:', err);
            // Handle error (maybe toast)
            setIsAnalyzing(false);
        }
    };

    const handleVoteUpdate = (link, newVotes) => {
        const updateList = (list) => list.map(article =>
            article.link === link ? { ...article, votes: newVotes } : article
        );

        setArticles(prev => updateList(prev));
        setShortlistedArticles(prev => updateList(prev));
    };

    const handleTagClick = async (tag) => {
        setIsAnalyzing(true);
        setActiveTag(tag);
        setAiPrompt(tag);
        setAnalysisStep(0);

        try {
            setTimeout(() => setAnalysisStep(1), 800);

            const response = await axios.post('http://localhost:3001/api/ai-filter', {
                prompt: tag,
                category: 'all'
            });

            setAnalysisStep(2);
            setTimeout(() => {
                setShortlistedArticles(response.data.matches);
                setViewMode('shortlisted');
                setIsAnalyzing(false);
            }, 500);
        } catch (err) {
            console.error('Error filtering by tag:', err);
            setIsAnalyzing(false);
            setActiveTag(null);
        }
    };

    const handleClearTagFilter = () => {
        setActiveTag(null);
        setViewMode('all');
        if (category === 'recommendations') {
            setCategory('all');
        }
    };

    const handlePrevPage = () => {
        if (page > 1) setPage(p => p - 1);
    };

    const handleNextPage = () => {
        if (page < totalPages) setPage(p => p + 1);
    };

    if (error) return <div className="error">{error}</div>;

    const displayedArticles = viewMode === 'shortlisted' ? shortlistedArticles : articles;

    return (
        <div className="feed-container">
            <AIFilter onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />

            {isAnalyzing && (
                <ProgressSteps
                    steps={['Fetching articles...', 'Analyzing with AI...', 'Shortlisting matches...']}
                    currentStep={analysisStep}
                />
            )}

            {viewMode === 'shortlisted' && !isAnalyzing && (
                <div className="ai-results-header">
                    <div>
                        <h3>{activeTag ? `🏷️ ${activeTag}` : 'AI Shortlist'}</h3>
                        <p style={{ fontSize: '14px', color: '#636c76' }}>
                            Found {shortlistedArticles.length} matches{activeTag ? ` for tag "${activeTag}"` : ` for "${aiPrompt}"`}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setViewMode('all');
                            setActiveTag(null);
                            if (category === 'recommendations') {
                                setCategory('all');
                            }
                        }}
                        className="pagination-btn"
                    >
                        <ArrowLeft size={16} /> Back to All Articles
                    </button>
                </div>
            )}

            {loading && viewMode === 'all' ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            ) : (
                <>
                    {displayedArticles.map((article) => (
                        <ArticleCard
                            key={article.link}
                            article={article}
                            onVote={handleVoteUpdate}
                            onTagClick={handleTagClick}
                        />
                    ))}

                    {viewMode === 'all' && (
                        <div className="pagination-controls">
                            <button
                                className="pagination-btn"
                                onClick={handlePrevPage}
                                disabled={page === 1}
                            >
                                <ChevronLeft size={16} /> Previous
                            </button>

                            <span className="pagination-info">
                                Page {page} of {totalPages}
                            </span>

                            <button
                                className="pagination-btn"
                                onClick={handleNextPage}
                                disabled={page === totalPages}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Feed;
