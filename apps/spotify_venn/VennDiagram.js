// React Venn Diagram Component with Zoom and Pan
const { useState, useEffect, useRef } = React;

// VennDiagram Component with zoom and drag functionality
function VennDiagram({ data, type = 'single' }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Handle mouse wheel for zooming
  const handleWheel = (e) => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const delta = -e.deltaY;
    const scaleAmount = delta > 0 ? 1.1 : 0.9;
    const newScale = Math.min(Math.max(0.5, transform.scale * scaleAmount), 5);

    // Zoom towards mouse position
    const scaleDiff = newScale - transform.scale;
    const newX = transform.x - (x - transform.x) * (scaleDiff / transform.scale);
    const newY = transform.y - (y - transform.y) * (scaleDiff / transform.scale);

    setTransform({ x: newX, y: newY, scale: newScale });
  };

  // Handle mouse down for dragging
  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX - transform.x,
        y: e.clientY - transform.y
      };
    }
  };

  // Handle mouse move for dragging
  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.current.x;
      const newY = e.clientY - dragStart.current.y;
      setTransform({ ...transform, x: newX, y: newY });
    }
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle touch events for mobile
  const touchStart = useRef({ x: 0, y: 0, distance: 0 });
  
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = {
        x: e.touches[0].clientX - transform.x,
        y: e.touches[0].clientY - transform.y
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStart.current.distance = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      const newX = e.touches[0].clientX - dragStart.current.x;
      const newY = e.touches[0].clientY - dragStart.current.y;
      setTransform({ ...transform, x: newX, y: newY });
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (touchStart.current.distance > 0) {
        const scaleAmount = distance / touchStart.current.distance;
        const newScale = Math.min(Math.max(0.5, transform.scale * scaleAmount), 5);
        setTransform({ ...transform, scale: newScale });
        touchStart.current.distance = distance;
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStart.current.distance = 0;
  };

  // Reset view
  const handleReset = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [transform, isDragging]);

  // Global mouse up listener
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, transform]);

  if (!data) {
    return React.createElement('div', { className: 'venn-empty' }, 'No data to display');
  }

  // Extract stats for fixed display
  const stats = data.type === 'genres' && data.genres && data.genres.length > 0
    ? data.genres[0].scoreText
    : null;
  const genreTitle = data.type === 'genres' && data.genres && data.genres.length > 0
    ? data.genres[0].genre
    : null;

  return React.createElement('div', { className: 'venn-diagram-wrapper' },
    React.createElement('div', { className: 'venn-controls' },
      React.createElement('button', {
        className: 'venn-control-btn',
        onClick: handleReset,
        title: 'Reset view'
      }, '⟲')
    ),
    React.createElement('div', {
      ref: containerRef,
      className: `venn-container ${isDragging ? 'dragging' : ''}`,
      onMouseDown: handleMouseDown,
      onDoubleClick: handleReset,
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      style: {
        cursor: isDragging ? 'grabbing' : 'grab',
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '500px'
      }
    },
      React.createElement('div', {
        style: {
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          width: '100%',
          height: '100%'
        }
      },
        data.type === 'single' 
          ? React.createElement(SingleVenn, { data })
          : data.type === 'compare'
          ? React.createElement(CompareVenn, { data })
          : React.createElement(GenreVennsGrid, { data })
      )
    ),
    // Fixed stats at the bottom
    stats ? React.createElement('div', { className: 'venn-stats-footer' },
      genreTitle ? React.createElement('span', { className: 'venn-stats-genre' }, genreTitle) : null,
      React.createElement('span', { className: 'venn-stats-text' }, stats)
    ) : null
  );
}

// Single user Venn diagram
function SingleVenn({ data }) {
  const W = 640, H = 420;
  const cx = W / 2, cy = H / 2 + 10;
  const r = data.radius || 150;

  return React.createElement('svg', {
    className: 'viz-svg single-venn',
    viewBox: `0 0 ${W} ${H}`,
    style: { width: '100%', height: 'auto' }
  },
    // Gradient definitions for beautiful circles
    React.createElement('defs', null,
      React.createElement('radialGradient', { id: 'single-gradient' },
        React.createElement('stop', { offset: '0%', stopColor: 'var(--spotify)', stopOpacity: '0.2' }),
        React.createElement('stop', { offset: '100%', stopColor: 'var(--spotify)', stopOpacity: '0.05' })
      ),
      React.createElement('filter', { id: 'glow' },
        React.createElement('feGaussianBlur', { stdDeviation: '4', result: 'coloredBlur' }),
        React.createElement('feMerge', null,
          React.createElement('feMergeNode', { in: 'coloredBlur' }),
          React.createElement('feMergeNode', { in: 'SourceGraphic' })
        )
      )
    ),
    // Circle with gradient
    React.createElement('circle', {
      className: 'circle-single',
      cx, cy, r,
      fill: 'url(#single-gradient)',
      stroke: 'var(--spotify)',
      strokeWidth: 2.5,
      filter: 'url(#glow)'
    }),
    // Label
    React.createElement('text', {
      className: 'label',
      x: cx - 70,
      y: cy - r - 16,
      fill: 'var(--ink)',
      fontSize: '14',
      fontWeight: '600'
    }, `@${data.username || 'you'}`),
    // Artist nodes
    ...(data.nodes || []).map((n, i) => 
      React.createElement('text', {
        key: i,
        className: 'artist-node',
        x: n.x,
        y: n.y,
        textAnchor: 'middle',
        fontSize: '11',
        fill: 'var(--ink)',
        opacity: 0.85,
        style: {
          animation: `float 3s ease-in-out infinite`,
          animationDelay: `${Math.random() * 2}s`
        }
      }, n.name)
    )
  );
}

// Comparison Venn diagram
function CompareVenn({ data }) {
  const W = 760, H = 500;
  
  return React.createElement('svg', {
    className: 'viz-svg compare-venn',
    viewBox: `0 0 ${W} ${H}`,
    style: { width: '100%', height: 'auto' }
  },
    // Gradient definitions
    React.createElement('defs', null,
      React.createElement('radialGradient', { id: 'left-gradient' },
        React.createElement('stop', { offset: '0%', stopColor: '#1db954', stopOpacity: '0.3' }),
        React.createElement('stop', { offset: '100%', stopColor: '#1db954', stopOpacity: '0.05' })
      ),
      React.createElement('radialGradient', { id: 'right-gradient' },
        React.createElement('stop', { offset: '0%', stopColor: '#4c84d6', stopOpacity: '0.3' }),
        React.createElement('stop', { offset: '100%', stopColor: '#4c84d6', stopOpacity: '0.05' })
      ),
      React.createElement('filter', { id: 'glow-compare' },
        React.createElement('feGaussianBlur', { stdDeviation: '3', result: 'coloredBlur' }),
        React.createElement('feMerge', null,
          React.createElement('feMergeNode', { in: 'coloredBlur' }),
          React.createElement('feMergeNode', { in: 'SourceGraphic' })
        )
      )
    ),
    // Left circle
    React.createElement('circle', {
      className: 'circle-left',
      cx: data.cx1, cy: data.cy, r: data.rLeft,
      fill: 'url(#left-gradient)',
      stroke: '#1db954',
      strokeWidth: 2.5,
      filter: 'url(#glow-compare)'
    }),
    // Right circle
    React.createElement('circle', {
      className: 'circle-right',
      cx: data.cx2, cy: data.cy, r: data.rRight,
      fill: 'url(#right-gradient)',
      stroke: '#4c84d6',
      strokeWidth: 2.5,
      filter: 'url(#glow-compare)'
    }),
    // Labels
    React.createElement('text', {
      className: 'label',
      x: data.cx1 - 80,
      y: data.cy - Math.max(data.rLeft, data.rRight) - 16,
      fill: 'var(--ink)',
      fontSize: '14',
      fontWeight: '600'
    }, `@${data.meUsername || 'you'}`),
    React.createElement('text', {
      className: 'label',
      x: data.cx2 - 80,
      y: data.cy - Math.max(data.rLeft, data.rRight) - 16,
      fill: 'var(--ink)',
      fontSize: '14',
      fontWeight: '600'
    }, `@${data.otherUsername || 'friend'}`),
    // Artist nodes
    ...((data.leftNodes || []).map((n, i) =>
      React.createElement('text', {
        key: `left-${i}`,
        className: 'artist-node artist-left',
        x: n.x, y: n.y,
        textAnchor: 'middle',
        fontSize: '11',
        fill: 'var(--ink)',
        opacity: 0.85,
        style: {
          animation: `float 3s ease-in-out infinite`,
          animationDelay: `${Math.random() * 2}s`
        }
      }, n.name)
    )),
    ...((data.rightNodes || []).map((n, i) =>
      React.createElement('text', {
        key: `right-${i}`,
        className: 'artist-node artist-right',
        x: n.x, y: n.y,
        textAnchor: 'middle',
        fontSize: '11',
        fill: 'var(--ink)',
        opacity: 0.85,
        style: {
          animation: `float 3s ease-in-out infinite`,
          animationDelay: `${Math.random() * 2}s`
        }
      }, n.name)
    )),
    ...((data.midNodes || []).map((n, i) =>
      React.createElement('text', {
        key: `mid-${i}`,
        className: 'artist-node artist-overlap',
        x: n.x, y: n.y,
        textAnchor: 'middle',
        fontSize: '11',
        fill: 'var(--ink)',
        opacity: 0.9,
        fontWeight: '600',
        style: {
          animation: `float 3s ease-in-out infinite`,
          animationDelay: `${Math.random() * 2}s`
        }
      }, n.name)
    ))
  );
}

// Genre Venns Grid
function GenreVennsGrid({ data }) {
  return React.createElement('div', { className: 'genre-venns-grid-react' },
    ...(data.genres || []).map((genreData, idx) =>
      React.createElement('div', {
        key: idx,
        className: 'genre-venn-container-react'
      },
        React.createElement('h3', { className: 'genre-title' }, genreData.genre),
        React.createElement(GenreCompareVenn, { data: genreData })
        // Removed genre-score from here - now in fixed footer
      )
    )
  );
}

// Individual Genre Comparison Venn
function GenreCompareVenn({ data }) {
  const W = 580, H = 250;

  if (data.singleUser) {
    // Single user genre view
    const cx = W / 2, cy = H / 2 + 10;
    return React.createElement('svg', {
      className: 'viz-svg genre-venn-svg',
      viewBox: `0 0 ${W} ${H}`,
      style: { width: '100%', height: 'auto' }
    },
      React.createElement('defs', null,
        React.createElement('radialGradient', { id: `genre-gradient-${data.genre}` },
          React.createElement('stop', { offset: '0%', stopColor: 'var(--spotify)', stopOpacity: '0.25' }),
          React.createElement('stop', { offset: '100%', stopColor: 'var(--spotify)', stopOpacity: '0.05' })
        ),
        React.createElement('filter', { id: `glow-${data.genre}` },
          React.createElement('feGaussianBlur', { stdDeviation: '3', result: 'coloredBlur' }),
          React.createElement('feMerge', null,
            React.createElement('feMergeNode', { in: 'coloredBlur' }),
            React.createElement('feMergeNode', { in: 'SourceGraphic' })
          )
        )
      ),
      React.createElement('circle', {
        className: 'circle-single',
        cx, cy, r: data.r,
        fill: `url(#genre-gradient-${data.genre})`,
        stroke: 'var(--spotify)',
        strokeWidth: 2,
        filter: `url(#glow-${data.genre})`
      }),
      React.createElement('text', {
        className: 'label',
        x: cx - 70,
        y: cy - data.r - 12,
        fill: 'var(--ink)',
        fontSize: '13',
        fontWeight: '600'
      }, `@${data.username || 'you'}`),
      ...(data.nodes || []).map((n, i) =>
        React.createElement('text', {
          key: i,
          className: 'artist-node',
          x: n.x, y: n.y,
          textAnchor: 'middle',
          fontSize: '10',
          fill: 'var(--ink)',
          opacity: 0.8
        }, n.name)
      )
    );
  }

  // Comparison view
  return React.createElement('svg', {
    className: 'viz-svg genre-venn-svg',
    viewBox: `0 0 ${W} ${H}`,
    style: { width: '100%', height: 'auto' }
  },
    React.createElement('defs', null,
      React.createElement('radialGradient', { id: `genre-left-gradient-${data.genre}` },
        React.createElement('stop', { offset: '0%', stopColor: '#1db954', stopOpacity: '0.25' }),
        React.createElement('stop', { offset: '100%', stopColor: '#1db954', stopOpacity: '0.05' })
      ),
      React.createElement('radialGradient', { id: `genre-right-gradient-${data.genre}` },
        React.createElement('stop', { offset: '0%', stopColor: '#4c84d6', stopOpacity: '0.25' }),
        React.createElement('stop', { offset: '100%', stopColor: '#4c84d6', stopOpacity: '0.05' })
      )
    ),
    React.createElement('circle', {
      className: 'circle-left',
      cx: data.cx1, cy: data.cy, r: data.rLeft,
      fill: `url(#genre-left-gradient-${data.genre})`,
      stroke: '#1db954',
      strokeWidth: 2
    }),
    React.createElement('circle', {
      className: 'circle-right',
      cx: data.cx2, cy: data.cy, r: data.rRight,
      fill: `url(#genre-right-gradient-${data.genre})`,
      stroke: '#4c84d6',
      strokeWidth: 2
    }),
    React.createElement('text', {
      className: 'label',
      x: data.cx1 - 60,
      y: data.cy - Math.max(data.rLeft, data.rRight) - 12,
      fill: 'var(--ink)',
      fontSize: '12',
      fontWeight: '600'
    }, `@${data.meUsername || 'you'}`),
    React.createElement('text', {
      className: 'label',
      x: data.cx2 - 60,
      y: data.cy - Math.max(data.rLeft, data.rRight) - 12,
      fill: 'var(--ink)',
      fontSize: '12',
      fontWeight: '600'
    }, `@${data.otherUsername || 'friend'}`),
    ...((data.leftNodes || []).map((n, i) =>
      React.createElement('text', {
        key: `left-${i}`,
        className: 'artist-node',
        x: n.x, y: n.y,
        textAnchor: 'middle',
        fontSize: '10',
        fill: 'var(--ink)',
        opacity: 0.8
      }, n.name)
    )),
    ...((data.rightNodes || []).map((n, i) =>
      React.createElement('text', {
        key: `right-${i}`,
        className: 'artist-node',
        x: n.x, y: n.y,
        textAnchor: 'middle',
        fontSize: '10',
        fill: 'var(--ink)',
        opacity: 0.8
      }, n.name)
    )),
    ...((data.midNodes || []).map((n, i) =>
      React.createElement('text', {
        key: `mid-${i}`,
        className: 'artist-node artist-overlap',
        x: n.x, y: n.y,
        textAnchor: 'middle',
        fontSize: '10',
        fill: 'var(--ink)',
        opacity: 0.9,
        fontWeight: '600'
      }, n.name)
    ))
  );
}

// Export the component
window.VennDiagram = VennDiagram;
