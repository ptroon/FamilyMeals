import React from 'react';

interface MethodViewerProps {
  methodText: string;
}

export const MethodViewer: React.FC<MethodViewerProps> = ({ methodText }) => {
  if (!methodText || !methodText.trim()) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No cooking instructions provided.</p>;
  }

  // Split method instructions by blank lines (\n\n or \r\n\r\n) as specified in requirements
  const steps = methodText
    .split(/\r?\n\s*\r?\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (steps.length === 0) {
    return <p>{methodText}</p>;
  }

  return (
    <div className="method-steps-container">
      {steps.map((step, index) => (
        <div key={index} className="method-step">
          <div className="step-number">{index + 1}</div>
          <div className="step-text">
            {step.split(/\r?\n/).map((line, lIdx) => (
              <p key={lIdx} style={{ marginBottom: lIdx === step.split(/\r?\n/).length - 1 ? 0 : '6px' }}>
                {line}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

