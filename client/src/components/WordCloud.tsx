import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import './WordCloud.css';

interface Word {
  text: string;
  count: number;
  size?: number;
  x?: number;
  y?: number;
  rotate?: number;
}

interface WordCloudProps {
  words: Word[];
  width: number;
  height: number;
  type: 'pull' | 'dont_pull';
  className?: string;
}

const WordCloud: React.FC<WordCloudProps> = ({ 
  words, 
  width, 
  height, 
  type, 
  className = '' 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [processedWords, setProcessedWords] = useState<Word[]>([]);

  useEffect(() => {
    if (!words.length || !svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    // Calculate font sizes based on frequency
    const maxCount = Math.max(...words.map(w => w.count), 1);
    const minSize = 12;
    const maxSize = 32;
    
    const fontScale = d3.scaleLinear()
      .domain([1, maxCount])
      .range([minSize, maxSize]);

    // Prepare words for d3-cloud
    const wordsWithSizes = words.map(word => ({
      ...word,
      size: fontScale(word.count)
    }));

    // Configure d3-cloud layout
    const layout = cloud()
      .size([width, height])
      .words(wordsWithSizes as any)
      .padding(5)
      .rotate(() => (Math.random() - 0.5) * 60) // Random rotation between -30 and 30 degrees
      .font('system-ui, -apple-system, sans-serif')
      .fontSize((d: any) => d.size || 16)
      .spiral('archimedean')
      .on('end', drawWords);

    layout.start();

    function drawWords(words: any[]) {
      setProcessedWords(words);

      const svg = d3.select(svgRef.current);
      const g = svg.append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

      const text = g.selectAll('text')
        .data(words)
        .enter().append('text')
        .style('font-size', d => `${d.size}px`)
        .style('font-family', 'system-ui, -apple-system, sans-serif')
        .style('font-weight', '600')
        .style('fill', getWordColor)
        .style('opacity', 0)
        .attr('text-anchor', 'middle')
        .attr('transform', d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
        .text(d => d.text);

      // Animate words appearing
      text.transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .style('opacity', 1);

      // Add hover effects
      text.on('mouseover', function(event, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .style('opacity', 0.7)
          .attr('transform', 
            `translate(${d.x},${d.y})rotate(${d.rotate})scale(1.1)`
          );
      })
      .on('mouseout', function(event, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .style('opacity', 1)
          .attr('transform', 
            `translate(${d.x},${d.y})rotate(${d.rotate})scale(1)`
          );
      });
    }

    function getWordColor(d: any, i: number): string {
      const colors = type === 'pull' 
        ? ['#e74c3c', '#c0392b', '#a93226', '#922b21']  // Reds for "Pull"
        : ['#27ae60', '#2ecc71', '#28b463', '#239b56']; // Greens for "Don't Pull"
      
      return colors[i % colors.length];
    }

  }, [words, width, height, type]);

  // Show loading state when no words
  if (!words.length) {
    return (
      <div className={`word-cloud empty ${className}`} style={{ width, height }}>
        <div className="empty-state">
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p>Waiting for responses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`word-cloud ${type} ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="word-cloud-svg"
        role="img"
        aria-label={`Word cloud showing ${type === 'pull' ? 'reasons to pull the lever' : 'reasons not to pull the lever'}`}
      />
      {/* Screen reader alternative */}
      <div className="sr-only">
        <h4>{type === 'pull' ? 'Reasons to Pull Lever:' : 'Reasons Not to Pull:'}</h4>
        <ul>
          {processedWords.map((word, i) => (
            <li key={i}>{word.text} (mentioned {word.count} times)</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default WordCloud;