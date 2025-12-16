import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

const ProgressSteps = ({ steps, currentStep }) => {
    return (
        <div className="progress-steps-container">
            {steps.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;

                return (
                    <div key={index} className={`step-item ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                        <div className="step-icon">
                            {isCompleted ? (
                                <CheckCircle2 size={20} className="text-green" />
                            ) : isCurrent ? (
                                <Loader2 size={20} className="animate-spin text-blue" />
                            ) : (
                                <Circle size={20} className="text-gray" />
                            )}
                        </div>
                        <span className="step-label">{step}</span>
                        {index < steps.length - 1 && (
                            <div className={`step-line ${isCompleted ? 'completed' : ''}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ProgressSteps;
