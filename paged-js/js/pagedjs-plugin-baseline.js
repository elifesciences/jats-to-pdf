// a plugin to work with a baseline
//
// set --pagedjs-baseline-offset-color to see where things are used
// collapsing margin makes things almost impossible to work with as we’re trying to move things around, which add margins to element by default

// next step is finding hte first offset for any object to move the baseline too

// next step put an offset to the base line to define the starting point.
// allow multiple baselines based on the parent.
// check this d,*-['&% '] collaping margins that make working with added object a pain. so this now is a padding to our element. it’s easier to manage but on the long term we should definitely change that to have a proper pushing objectd.

class baselineProcess extends Paged.Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
    this.snapToBaselineClass = "pagedjs-snap-to-baseline";
    this.await;
    this.snapToBaseline = [];
  }

  //find from the css the element you wanna have on the grid
  onDeclaration(declaration, dItem, dList, rule) {
    if (declaration.property == "--pagedjs-baseline-snap") {
      let sel = csstree.generate(rule.ruleNode.prelude);
      sel = sel.replace('[data-id="', "#");
      sel = sel.replace('"]', "");
      this.snapToBaseline.push([sel.split(","), declaration.value]);
    }
  }

  //find from the css the element you wanna have on the baseline
  afterParsed(content) {
    if (("this", this.snapToBaseline)) {
      this.snapToBaseline.forEach((entry) => {
        content.querySelectorAll(entry[0]).forEach((el) => {
          // console.log(entry[0])
          // console.log(entry[1].value)
          el.classList.add(this.snapToBaselineClass);
          el.dataset.snapBaseline = entry[1].value;
          el.style.lineHeight = entry[1].value
        });
      });
    }
  }

  // check the offset value
  renderNode(node) {
    // put all node on base line
    if (
      node &&
      node.nodeType == "1" &&
      node.classList.contains(this.snapToBaselineClass)
    ) {
    node.parentElement.classList.add("snapparent")
      startBaseline(node, parseInt(node.dataset.snapBaseline));
    }
  }
}
function startBaseline(element, baseline) {
  // snap element after specific element on the baseline grid.

  if (element && element.offsetTop) {
    // le nb de pixel entre l’élément et son parent
    const elementOffsetTop = element.offsetTop; // element à x pixel de haut

    // get the current line number
    const currentLine = Math.floor(element.offsetTop / baseline); // element à x pixel de haut

    // check the difference between the baseline place and the top offset
    const difference = elementOffsetTop % baseline; // element donc sur la ligne y

    // next line
    const nextLine = Math.ceil(element.offsetTop / baseline);

    // nextLine
    const nextLineOffset = nextLine * baseline;

    if (difference > 0) {
      element.style.paddingTop = baseline - difference + "px";
    }
  }
}

Paged.registerHandlers(baselineProcess);
