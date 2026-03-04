const { createElement } = React;

function VennDiagram(props) {
  if (window.GenreVennDiagram) {
    return createElement(window.GenreVennDiagram, props);
  }

  return createElement('div', { className: 'venn-empty' }, 'GenreVennDiagram is not available.');
}

window.VennDiagram = VennDiagram;
