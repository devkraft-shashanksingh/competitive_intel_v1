import React from 'react';

const SkeletonCard = () => {
    return (
        <div className="card skeleton-card">
            <div className="card-header">
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton skeleton-btn"></div>
            </div>

            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>

            <div className="card-footer">
                <div className="skeleton skeleton-circle"></div>
                <div className="skeleton skeleton-badge"></div>
                <div className="skeleton skeleton-badge" style={{ marginLeft: 'auto' }}></div>
            </div>
        </div>
    );
};

export default SkeletonCard;
