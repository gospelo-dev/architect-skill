/**
 * JavaScript templates for diagram rendering
 * Extracted from Renderer.ts for better organization
 */

/**
 * Viewer script for resize functionality
 */
export function getViewerScript(): string {
  return `
(function() {
  var svg = document.querySelector('.gospelo-svg');
  if (!svg) return;

  var handle = svg.querySelector('.resize-handle');
  if (!handle) return;

  var isResizing = false;
  var startX, startY, startWidth, startHeight;

  var viewBox = svg.getAttribute('viewBox').split(' ').map(Number);
  var originalWidth = viewBox[2];
  var originalHeight = viewBox[3];
  var aspectRatio = originalWidth / originalHeight;

  handle.addEventListener('mousedown', function(e) {
    e.preventDefault();
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseFloat(svg.getAttribute('width'));
    startHeight = parseFloat(svg.getAttribute('height'));
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', function(e) {
    if (!isResizing) return;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    var delta = (dx + dy) / 2;
    var newWidth = Math.max(400, startWidth + delta);
    var newHeight = newWidth / aspectRatio;
    if (newHeight < 300) {
      newHeight = 300;
      newWidth = newHeight * aspectRatio;
    }
    svg.setAttribute('width', newWidth);
    svg.setAttribute('height', newHeight);
  });

  document.addEventListener('mouseup', function() {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
})();
`;
}

/**
 * Interactive script for shareable/preview HTML
 * Includes hover tooltips, click-to-copy, and area selection
 */
export function getInteractiveScript(
  nodeIconMap: Record<string, { icon: string; desc?: string; license: string }>,
  nodeBoundsMap: Record<string, { left: number; top: number; right: number; bottom: number }>
): string {
  return `
(function() {
  var nodeInfo = ${JSON.stringify(nodeIconMap)};
  var nodeBounds = ${JSON.stringify(nodeBoundsMap)};
  var tooltip = document.getElementById('hover-tooltip');
  var toast = document.getElementById('copy-toast');
  var nodes = document.querySelectorAll('.node, .composite-icon');
  var svg = document.querySelector('.gospelo-svg');
  var selectionRect = document.getElementById('selection-rect');
  var copyBtn = document.getElementById('copy-btn');

  // Area selection state
  var isSelecting = false;
  var startX = 0, startY = 0;
  var selectedNodeIds = [];

  // Tooltip and click-to-copy for individual nodes
  nodes.forEach(function(node) {
    var nodeId = node.id;
    var info = nodeInfo[nodeId];

    node.addEventListener('mouseenter', function(e) {
      if (isSelecting) return;
      var html = '<strong>ID:</strong> ' + nodeId;
      if (info && info.icon) {
        html += '<br><strong>Icon:</strong> ' + info.icon;
      }
      if (info && info.license) {
        html += '<br><strong>License:</strong> ' + info.license;
      }
      if (info && info.desc) {
        html += '<br><strong>Desc:</strong> ' + info.desc;
      }
      tooltip.innerHTML = html;
      tooltip.style.opacity = '1';
      updateTooltipPosition(e);
    });

    node.addEventListener('mousemove', function(e) {
      if (!isSelecting) updateTooltipPosition(e);
    });

    node.addEventListener('mouseleave', function() {
      tooltip.style.opacity = '0';
    });

    node.addEventListener('click', function(e) {
      if (selectedNodeIds.length > 0) return;
      navigator.clipboard.writeText(nodeId).then(function() {
        toast.textContent = 'Copied: ' + nodeId;
        toast.style.opacity = '1';
        setTimeout(function() { toast.style.opacity = '0'; }, 1500);
      });
    });
  });

  function updateTooltipPosition(e) {
    var x = e.clientX + 15;
    var y = e.clientY + 15;
    if (x + tooltip.offsetWidth > window.innerWidth - 10) {
      x = e.clientX - tooltip.offsetWidth - 15;
    }
    if (y + tooltip.offsetHeight > window.innerHeight - 10) {
      y = e.clientY - tooltip.offsetHeight - 15;
    }
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }

  function screenToSvg(clientX, clientY) {
    var pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    var svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: svgPt.x, y: svgPt.y };
  }

  function rectsIntersect(r1, r2) {
    return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
  }

  function clearSelection() {
    selectedNodeIds = [];
    nodes.forEach(function(n) { n.classList.remove('selected'); });
    copyBtn.style.display = 'none';
    selectionRect.style.display = 'none';
  }

  function showCopyBtn(x, y) {
    copyBtn.setAttribute('transform', 'translate(' + x + ',' + y + ')');
    copyBtn.style.display = 'block';
  }

  svg.addEventListener('mousedown', function(e) {
    if (e.target === copyBtn || copyBtn.contains(e.target)) {
      return;
    }
    if (!e.shiftKey) {
      clearSelection();
      return;
    }
    e.preventDefault();
    isSelecting = true;
    tooltip.style.opacity = '0';
    var svgPt = screenToSvg(e.clientX, e.clientY);
    startX = svgPt.x;
    startY = svgPt.y;
    selectionRect.setAttribute('x', startX);
    selectionRect.setAttribute('y', startY);
    selectionRect.setAttribute('width', 0);
    selectionRect.setAttribute('height', 0);
    selectionRect.style.display = 'block';
    svg.style.cursor = 'crosshair';
  });

  document.addEventListener('mousemove', function(e) {
    if (!isSelecting) return;
    var svgPt = screenToSvg(e.clientX, e.clientY);
    var x = Math.min(startX, svgPt.x);
    var y = Math.min(startY, svgPt.y);
    var w = Math.abs(svgPt.x - startX);
    var h = Math.abs(svgPt.y - startY);
    selectionRect.setAttribute('x', x);
    selectionRect.setAttribute('y', y);
    selectionRect.setAttribute('width', w);
    selectionRect.setAttribute('height', h);

    var selRect = { left: x, top: y, right: x + w, bottom: y + h };
    nodes.forEach(function(n) {
      var bounds = nodeBounds[n.id];
      var inCurrentRect = bounds && rectsIntersect(selRect, bounds);
      var alreadySelected = selectedNodeIds.indexOf(n.id) !== -1;
      if (inCurrentRect || alreadySelected) {
        n.classList.add('selected');
      } else {
        n.classList.remove('selected');
      }
    });
  });

  document.addEventListener('mouseup', function(e) {
    if (!isSelecting) return;
    isSelecting = false;
    svg.style.cursor = '';

    nodes.forEach(function(n) {
      if (n.classList.contains('selected') && selectedNodeIds.indexOf(n.id) === -1) {
        selectedNodeIds.push(n.id);
      }
    });

    if (selectedNodeIds.length > 0) {
      var svgPt = screenToSvg(e.clientX, e.clientY);
      showCopyBtn(svgPt.x + 10, svgPt.y - 16);
    }
    selectionRect.style.display = 'none';
  });

  copyBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (selectedNodeIds.length === 0) return;
    var text = selectedNodeIds.join('\\n');
    navigator.clipboard.writeText(text).then(function() {
      toast.textContent = 'Copied ' + selectedNodeIds.length + ' IDs';
      toast.style.opacity = '1';
      setTimeout(function() { toast.style.opacity = '0'; }, 1500);
      clearSelection();
    });
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      clearSelection();
    }
  });
})();
`;
}
