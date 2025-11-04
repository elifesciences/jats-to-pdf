// this script wil put any element with the property
// `position: fill page` on the next page while keeping the rest of the content flowing.
// could be look at page-float: next top;
//
//
//a fair warning, if the element is longer than a page, we need to dig it a little bit, as there is a designer question.
// /we shouldn’t answer in the place of the designer.
//
//
// use:
//
// ---===---===---
//
//   .elementToFill {
//     --experimental-position: fill-page;
//   }
//
//   if you want to override it
//   not the best option yet, but we don’t want to rebuild the whole css system, so we’re stuck with this option.
//   That said, maybe we should use
//
//   .something .elementToFill {
//   --experimental-position: dont-fill;
//   }
//
// ---===---===---
//
// the pagedjs-fillpage template is created by the script to manage the layout of the fullpage layout
//
//this will try to fill up the page with any image coming up from the content
//
//
//

// how it works:
// when there is a node with the right class list to the page,
// check the remaining space. If there isn’t enough, move the elment to an arrya
//

// if so start the page with the element (or addit to the wrapper)
//
// if there is enough space, leave it be.

const refillpageclass = "pagedjs-fill-next-page";

class refillpage extends Paged.Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
    this.refillPageElements = [];
    this.repushToNextPage = [];
    this.reputThatFirst = [];
    this.reneedPage = [];
  }

  //read the css to find the elements that will automatically fill page
  onDeclaration(declaration, dItem, dList, rule) {
    if (declaration.property == "--experimental-position") {
      console.log(declaration.value.value);
      if (declaration.value.value.includes("fill-page")) {
        let sel = csstree.generate(rule.ruleNode.prelude);
        // if it happened after the other script, just remove the data id from the selector to select the id.
        sel = sel.replace('[data-id="\\"', "#");
        sel = sel.replace('\\""]', "");
        let selectors = sel.split(",");
        selectors.forEach((selecting) => {
          this.refillPageElements.push([selecting, "fillpage"]);
        });
      } else if (declaration.value.value.includes("dont-fill")) {
        let sel = csstree.generate(rule.ruleNode.prelude);
        // if it happened after the other script, just remove the data id from the selector to select the id.
        sel = sel.replace('[data-id="\\"', "#");
        sel = sel.replace('\\""]', "");
        let selectors = sel.split(",");
        selectors.forEach((selecting) => {
          this.refillPageElements.push([selecting, "dontfill"]);
        });
      }
    }
    console.log(this.refillPageElements);
  }

  async afterParsed(parsed) {
    // add the width and height to the image as attribute to get more data about what they are
    await addWidthHeightToImg(parsed);

    //find from the css the element you wanna have full page
    if (("this", this.refillPageElements)) {
      this.refillPageElements.forEach((selector) => {
        console.log(selector[1]);
        if (selector[1] == "dontfill") {
          console.log("dont", selector);
          parsed.querySelectorAll(selector[0]).forEach((el) => {
            // el.style.display = "none";
            el.classList.add("dontfill");
            el.classList.remove(refillpageclass);
            el.style.display = "block";
          });
        } else if (selector[1] == "fillpage") {
          console.log("fill");
          parsed.querySelectorAll(selector[0]).forEach((el) => {
            console.log(el)
            el.style.display = "none";
            el.classList.add(refillpageclass);
          });
        }
      });
    }

  }

  renderNode(node, sourcenode) {
    // find a way to leave it if the node has enough room on the page
    //if node not element

    let pageHeight = getLastPage().querySelector(
      ".pagedjs_page_content",
    ).offsetHeight;

    if (node.nodeType === 1 && node.classList.contains(refillpageclass)) {
      // check the remaining space & check the element height
      let height = getHeightOfHiddenElement(node);
      // let spaceOnPage = getRemainingSpaceOnPage(getLastPage());
      let spaceOnPage = getRemainHeight(getLastPage());

      if (height > pageHeight * 0.8) {
        node.classList.add("topushonitsownpage");
      } else if (height > spaceOnPage) {
        node.remove();
        // push the element to the node
        let newnode = node.cloneNode(true);
        newnode.id += "clone";
        newnode.classList.add("ok-to-fill");
        newnode.style.display = "block";
        this.reputThatFirst.push(newnode);
        console.log("first", this.reputThatFirst);
      } else if (height < spaceOnPage) {
        // do nothing, the element has enough room
        node.classList.add("enoughroom");
        node.style.display = "block";
      }
    }
  }

  onPageLayout(page, Token, layout) {
    // console.log(this.reneedPage);
    // console.log(this.reputThatFirst);
    // right now, add to the
    while (this.reneedPage.length > 0) {
      this.reputThatFirst.push(this.reneedPage.pop());
    }
    while (this.reputThatFirst.length > 0) {
      console.log(this.reputThatFirst);
      // get the first element while removing it from the array
      const elem = this.reputThatFirst.shift();

      // check if there is enough room to put the element, and make sure that it’s not a continuted figure,

      if (getHeightOfHiddenElement(elem) < getRemainingSpaceOnPage(page)) {
        // check if there is enough room, otherwise add a page
        elem.className = "pagedjs-filler-original";
        elem.style.display = "block";

        // recreate the tree and start the page with this element
        const nested = getElementWithTree(elem, this.chunker);

        page.insertAdjacentElement("beforebegin", nested);
      } else {
        this.reneedPage.push(elem);
        console.log(this.chunker);
        nochild;
        console.log("no child");
        elem.className = "pagedjs-filler-original";
        elem.style.display = "block";
        // elem.style.marginBottom = "17px";
        // console.log("dataset", elem.dataset);
        const nested = getElementWithTree(elem, this.chunker);

        // console.log(nested);

        page.insertAdjacentElement("beforebegin", nested);
      }
    }
  }

  async finalizePage(page) {
    // debugger;
    page.querySelectorAll(".topushonitsownpage").forEach((node) => {
      // add the content on its own page
      let newPage = this.chunker.addPage();
      newPage.element.classList.add("addedpageblock");

      // get the source node and recreate the tree
      const sourcenode = this.chunker.source.querySelector(
        `[data-ref="${node.dataset.ref}"]`,
      );
      let closest = sourcenode.parentElement;
      let newtree = [];

      while (closest.parentElement) {
        newtree.push(closest.cloneNode(false));
        closest = closest.parentElement;
      }

      // create a clone
      let clone = node.cloneNode(true);
      clone.id = `autofilled-${node.id}`;
      clone.style.display = "block";

      // recreate the tree by adding the node to the final element
      newtree[newtree.length - 1].appendChild(clone);

      // recreate the tree
      let nested = nestElements(newtree);
      console.log("nest", nested);

      // include the newest version
      newPage.area.insertAdjacentElement("afterbegin", nested);
    });
  }
}

Paged.registerHandlers(refillpage);

async function addWidthHeightToImg(content) {
  let imagePromises = [];
  let images = content.querySelectorAll("img");
  images.forEach((image) => {
    let img = new Image();
    let resolve, reject;
    let imageLoaded = new Promise(function(r, x) {
      resolve = r;
      reject = x;
    });

    img.onload = function() {
      let height = img.naturalHeight;
      let width = img.naturalWidth;
      image.setAttribute("height", height);
      image.setAttribute("width", width);
      resolve();
    };
    img.onerror = function() {
      reject();
    };

    img.src = image.src;

    imagePromises.push(imageLoaded);
  });
  return Promise.all(imagePromises).catch((err) => {
    console.warn("err", err);
  });
}

// get the homothetic reduce height when reducing the width to see if the image can get in.
// with a baseline
function getHeight(originalWidth, originalHeight, reducedWidth, baseline) {
  const homotheticHeight = (reducedWidth * originalHeight) / originalWidth;
  const baselineHeight = Math.floor(homotheticHeight / baseline) * baseline;
  return Math.floor(baselineHeight);
}

function checkImageHeightRatio(imageHeight, availableSpace) {
  return imageHeight / availableSpace;
}

function resizeToBaseline(originalWidth, originalHeight, baselineGrid) {
  // Calculate the new height relative to the baseline grid
  const baselineHeight =
    Math.floor(originalHeight / baselineGrid) * baselineGrid;

  // Calculate the width reduction ratio based on the new height
  const reductionRatio = baselineHeight / originalHeight;

  // Calculate the new width proportionally
  const reducedWidth = originalWidth * reductionRatio;

  // Return the reduced dimensions as an object
  return {
    width: reducedWidth,
    height: baselineHeight,
  };
}

//check if the element is the the nessted first child of the page
function isNestedFirstChild(childElement, parentElement) {
  const firstChild = parentElement.firstElementChild;
  return firstChild === childElement;
}

// check if element is empty
function isElementEmpty(element) {
  return element.textContent.trim() === "";
}

// function to move thing to a new page
//
//
//

function getLastBlockOffsetBottom(element) {
  // console.log(element.children)
  // console.log(element);

  if (!element) return 0;
  if (!element.hasChildNodes) return 0;
  const children = element.children;
  let lastBlockOffsetBottom = 0;

  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];

    // Check if the child is a block-level element (by checking it’s display)
    // const display = window.getComputedStyle(child).display;
    // Calculate the cumulative offset bottom
    const childOffsetBottom = child.offsetTop + child.offsetHeight;

    // Update the last block offset bottom if it's greater
    if (childOffsetBottom > lastBlockOffsetBottom) {
      lastBlockOffsetBottom = childOffsetBottom;
    }

    // Recursively check nested elements
    const nestedBlockOffsetBottom = getLastBlockOffsetBottom(child);
    if (nestedBlockOffsetBottom > lastBlockOffsetBottom) {
      // console.log(nestedBlockOffsetBottom);
      // console.log(lastBlockOffsetBottom);
      lastBlockOffsetBottom = nestedBlockOffsetBottom;
    }
  }

  // return the offset bottom in px (number)
  return lastBlockOffsetBottom;
}

function getRemainHeight(page) {
  // console.log(
  return page.querySelector(".pagedjs_page_content div").lastElementChild
    .offsetHeight;
}

async function getRemainingSpaceOnPage(page, security = 80) {
  const parentHeight = parseInt(
    window.getComputedStyle(
      getLastPage().querySelector(".pagedjs_page_content"),
    ).height,
  );
  if (!page) page = getLastPage();
  let result =
    parentHeight -
    getLastBlockOffsetBottom(
      getLastPage().querySelector(".pagedjs_page_content div"),
    ) -
    security;
  console.log("result", result);
  return result;
}

function getLastPage() {
  // create a page variable which is the one pagedjs is working on.
  // use latest page to get the latest page
  let pages = document.querySelectorAll(".pagedjs_page");
  const latestPage = pages[pages.length - 1];
  return latestPage;
}

// WIDTH
// current image width / biggest img * 100%;

// this let us find a correspondances of width for the image we get.
// really experimental

function getHeightOfHiddenElement(element) {
  // find a page to render on
  let pageToRenderOn = getLastPage();

  let clone = element.cloneNode(true);
  clone.style.position = "absolute";
  clone.style.top = "0";
  clone.style.left = "0";
  clone.style.display = "block";

  // insert a clone of that element
  pageToRenderOn
    .querySelector(".pagedjs_page_content")
    .insertAdjacentElement("afterbegin", clone);

  // get margin in case there are some (margins also come with trouble)
  let margins = clone.style.marginTop + clone.style.marginBottom;

  // get the height of the elements + the margins
  let elementHeight = clone.offsetHeight + margins;

  // delete the clone we used to get the height
  clone.remove();

  // return the height as number
  return elementHeight;
}

function nestElements(array) {
  for (let i = 0; i < array.length - 1; i++) {
    array[i].appendChild(array[i + 1]);
  }
  return array[0]; // Return the root element after nesting
}

function getElementWithTree(node, chunker = this.chunker) {
  // recreate the tree to keep the numbering/css working
  console.log(node, chunker);
  // get the source node
  const sourcenode = chunker.source.querySelector(
    `[data-ref="${node.dataset.ref}"]`,
  );
  let closest = sourcenode.parentElement;
  let newtree = [];

  while (closest.parentElement) {
    console.log("newtree", newtree);
    newtree.push(closest.cloneNode(false));
    closest = closest.parentElement;
  }

  // create a clone
  let clone = node.cloneNode(true);
  clone.id = `autofilled-${node.id}`;
  clone.style.display = "block";

  console.log(node);

  // recreate the tree by adding the node to the final element
  newtree[newtree.length - 1].appendChild(clone);

  // recreate the tree
  let nested = nestElements(newtree);
  return nested;
}
