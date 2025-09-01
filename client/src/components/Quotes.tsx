import React from 'react';

interface QuotesProps {
  quotes: string[];
  type: 'pull' | 'dont_pull' | 'mitigations';
  maxQuotes?: number;
}

const Quotes: React.FC<QuotesProps> = ({ quotes, type, maxQuotes = 5 }) => {
  // Filter out empty quotes and limit to maxQuotes
  const displayQuotes = quotes.filter(q => q && q.trim()).slice(0, maxQuotes);

  if (displayQuotes.length === 0) {
    return (
      <div className="quotes-empty">
        No rationales provided
      </div>
    );
  }

  return (
    <div className={`quotes-container quotes-${type}`}>
      {displayQuotes.map((quote, index) => (
        <blockquote key={index} className="participant-quote">
          "{quote}"
        </blockquote>
      ))}
    </div>
  );
};

export default Quotes;