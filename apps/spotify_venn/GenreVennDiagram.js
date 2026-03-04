const { useEffect, useMemo, useRef } = React;

function GenreVennDiagram({ mode = 'grid', diagrams = [], diagram = null, onDiagramClick = null, compact = false }) {
  if (mode === 'single' && diagram) {
    return React.createElement(GenreVennCard, {
      model: diagram,
      compact,
      clickable: false,
      onClick: null,
    });
  }

  return React.createElement(
    'div',
    { className: 'genre-venns-grid-react' },
    diagrams.map((model) =>
      React.createElement(GenreVennCard, {
        key: model.key,
        model,
        compact,
        clickable: typeof onDiagramClick === 'function',
        onClick: onDiagramClick,
      })
    )
  );
}

function GenreVennCard({ model, compact, clickable, onClick }) {
  const handleClick = () => {
    if (clickable && typeof onClick === 'function') {
      onClick(model.key);
    }
  };

  return React.createElement(
    'div',
    {
      className: 'genre-venn-container-react',
      role: clickable ? 'button' : undefined,
      tabIndex: clickable ? 0 : undefined,
      onClick: handleClick,
      onKeyDown: (event) => {
        if (!clickable) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      },
      'data-genre': model.key,
    },
    React.createElement('h3', { className: 'genre-title' }, model.title),
    React.createElement(VennLibraryChart, {
      areas: model.vennAreas,
      compact,
      chartKey: model.key,
    }),
    React.createElement('p', { className: 'genre-score' }, model.subtitle)
  );
}

function VennLibraryChart({ areas, compact, chartKey }) {
  const containerRef = useRef(null);
  const safeAreas = useMemo(() => (Array.isArray(areas) ? areas : []), [areas]);

  // Instead of circles, render three lists: user1 only, overlap, user2 only
  const leftArea = safeAreas.find(a => a.areaType === 'left');
  const overlapArea = safeAreas.find(a => a.areaType === 'overlap');
  const rightArea = safeAreas.find(a => a.areaType === 'right');

  return React.createElement('div', {
    className: 'genre-venn-lists',
    style: { display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'flex-start' },
    'aria-label': `Genre venn lists ${chartKey}`,
  },
    React.createElement('div', { className: 'artist-list' },
      React.createElement('h4', null, leftArea ? leftArea.label : 'User 1'),
      React.createElement('ul', null,
        (leftArea && leftArea.items.length ? leftArea.items : []).map((name, i) =>
          React.createElement('li', { key: i }, name)
        )
      )
    ),
    React.createElement('div', { className: 'artist-list' },
      React.createElement('h4', null, overlapArea ? overlapArea.label : 'Shared'),
      React.createElement('ul', null,
        (overlapArea && overlapArea.items.length ? overlapArea.items : []).map((name, i) =>
          React.createElement('li', { key: i }, name)
        )
      )
    ),
    React.createElement('div', { className: 'artist-list' },
      React.createElement('h4', null, rightArea ? rightArea.label : 'User 2'),
      React.createElement('ul', null,
        (rightArea && rightArea.items.length ? rightArea.items : []).map((name, i) =>
          React.createElement('li', { key: i }, name)
        )
      )
    )
  );
}

window.GenreVennDiagram = GenreVennDiagram;
window.VennDiagram = GenreVennDiagram;
