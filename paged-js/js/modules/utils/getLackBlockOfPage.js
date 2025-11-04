function getLastBlockOffsetBottom(element) {
  const children = element?.children;
  let lastBlockOffsetBottom = 0;

  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];

    // Check if the child is a block-level element (by checking it’s display)
    const display = window.getComputedStyle(child).display;
    if (display === "block") {
      // Calculate the cumulative offset bottom
      const childOffsetBottom = child.offsetTop + child.offsetHeight;

      // Update the last block offset bottom if it's greater
      if (childOffsetBottom > lastBlockOffsetBottom) {
        lastBlockOffsetBottom = childOffsetBottom;
      }

      // Recursively check nested elements
      const nestedBlockOffsetBottom = getLastBlockOffsetBottom(child);
      if (nestedBlockOffsetBottom > lastBlockOffsetBottom) {
        lastBlockOffsetBottom = nestedBlockOffsetBottom;
      }
    }
  }

  // return the offset bottom in px (number)
  return lastBlockOffsetBottom;
}
