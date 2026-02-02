// Set the handler
class elifeBuild extends Paged.Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
    this.targets = {};
  }

  async beforeParsed(content) {

    await finalizeMathJax();

    // to divide figure in block
    dispatchFigure(content);

    //tag figure
    tagImgInFigures(content);

    // add id to anything to fix things
    addIDtoEachElement(content);
  }

  // Collect page numbers for elements to add into page-ref links
  afterPageLayout(page) {
    if (!page) {
        return;
    }
    const pageNumber = page.getAttribute('data-page-number');
    if (!pageNumber) {
        return;
    }
    const elementsWithIds = page.querySelectorAll('[id]');
    Array.from(elementsWithIds).forEach((el) => {
      this.targets[el.id] = pageNumber;
    });
  }

  afterRendered(pages) {
    // add the running head
    let runninghead = document.querySelector(".runninghead");
    // add the MSAs
    let msas = document.querySelector(".article-flag-list");
    // add the logo
    let logo = document.getElementById("logo");
    document
      .querySelectorAll(".pagedjs_pagedjs-filler_page")
      .forEach((page) => {
        if (runninghead) {
          page
            .querySelector(".pagedjs_pagebox")
            .insertAdjacentElement("afterbegin", runninghead.cloneNode(true));
        }
        if (msas) {
          page
            .querySelector(".pagedjs_pagebox")
            .insertAdjacentElement("afterbegin", msas.cloneNode(true));
        }
        let marginForLogo = page.querySelector(".pagedjs_margin-top-left > .pagedjs_margin-content");
        let marginBox = page.querySelector(".pagedjs_margin-top-left");
        if (logo && marginForLogo) {
          marginForLogo.insertAdjacentElement("afterbegin", logo.cloneNode(true));
          if (marginBox) {
            marginBox.classList.add("hasContent");
            }  
        }
      });
      
      // Introduce page numbers for page links
      document.querySelectorAll(".page-ref").forEach((refLink) => {
        const targetId = refLink.getAttribute("href").substring(1);
        const targetPageNumber = this.targets[targetId];
        if (targetPageNumber !== undefined) {
          refLink.textContent = `page ${targetPageNumber}`;
        } else {
          refLink.textContent = 'page ??';
          console.warn(`Target ID #${targetId} not found for page link.`);
        }
      });
  }
}

Paged.registerHandlers(elifeBuild);

// To use to remove hyphens between pages
function getFinalWord(words) {
  var n = words.split(" ");
  return n[n.length - 1];
}


/*========================== 
         addIDtoEachElement
    ========================== */

// Define here the tags you want to give id
let tags = [
  "figure",
  "figcaption",
  "img",
  "ol",
  "ul",
  "li",
  "p",
  "table",
  "h1",
  "h2",
  "h3",
  "h4",
  "div",
  "aside",
];

function addIDtoEachElement(content) {
  let total = 0;
  tags.forEach((tag) => {
    content.querySelectorAll(tag).forEach((el, index) => {
      if (!el.id) {
        if (el.tagName == "p") {
          if (el.closest("figcaption")) {
            return;
          }
        }

        el.id = `el-${el.tagName.toLowerCase()}-${index}`;
        total++;
      }
    });
  });
}

// no hyphens between page
class noHyphenBetweenPage extends Paged.Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
    this.hyphenToken;
  }

  afterPageLayout(pageFragment, page, breakToken) {
    if (pageFragment.querySelector(".pagedjs_hyphen")) {
      // find the hyphenated word
      let block = pageFragment.querySelector(".pagedjs_hyphen");

      // i dont know what that line was for :thinking: i removed it
      // block.dataset.ref = this.prevHyphen;

      // move the breakToken
      let offsetMove = getFinalWord(block.innerHTML).length;

      // move the token accordingly
      page.breakToken = page.endToken.offset - offsetMove;

      // remove the last word
      block.innerHTML = block.innerHTML.replace(
        getFinalWord(block.innerHTML),
        ""
      );

      breakToken.offset = page.endToken.offset - offsetMove;
    }
  }
}

Paged.registerHandlers(noHyphenBetweenPage);

class pushThings extends Paged.Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
    this.pushblock = [];
  }
  onDeclaration(declaration, dItem, dList, rule) {
    // move the element to the next bit
    if (declaration.property == "--experimental-push") {
      let sel = csstree.generate(rule.ruleNode.prelude);
      sel = sel.replace('[data-id="', "#");
      sel = sel.replace('"]', "");
      let itemsList = sel.split(",");
      itemsList.forEach((elId) => {
        this.pushblock.push([elId, declaration.value.value]);
      });
    }
  }
  afterParsed(parsed) {
    //reset the page break for the figures titles
    // let titles1 = parsed.querySelectorAll("h1,h2");
    // titles1.forEach((title, index) => {
    //   if (
    //     title.classList?.contains("probably-figures-title") &&
    //     !title.classList?.contains("skipBreakAfter")
    //   ) {
    //     title.dataset.breakAfter = "page";
    //   }
    //   if (
    //     title.classList?.contains("probably-figures-title-after") &&
    //     !title.classList?.contains("skipBreakBefore")
    //   ) {
    //     title.dataset.breakBefore = "page";
    //     delete title.dataset.breakAfter;
    //   }
    // });

    if (this.pushblock.length > 0) {
      this.pushblock.forEach((elToPush) => {
        const elem = parsed.querySelector(elToPush[0]);
        if (!elem) {
          return;
        }

        elem.dataset.pushBlock = elToPush[1];
        let direction = "";
        if (elToPush[1] < 0) {
          direction = "back";
        }
        if (direction == "back") {
          for (let index = 0; index < Math.abs(elToPush[1]); index++) {
            if (elem.previousElementSibling) {
              elem.previousElementSibling.insertAdjacentElement(
                "beforebegin",
                elem
              );
            }
          }
        } else {
          for (let index = 0; index < Math.abs(elToPush[1]); index++) {
            if (elem.nextElementSibling) {
              elem.nextElementSibling.insertAdjacentElement(
                "beforebegin",
                elem
              );
            }
          }
        }
      });
    }
  }
}

Paged.registerHandlers(pushThings);

class CSStoClass extends Paged.Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
    this.floatSameTop = [];
    this.floatSameBottom = [];
    this.floatNextTop = [];
    this.floatNextBottom = [];
    this.experimentalImageEdit = [];
    this.spacing = [];
    this.pushblock = [];
    this.experimentalMerged = [];
    this.fullPageBackground = [];
  }
  onDeclaration(declaration, dItem, dList, rule) {
    // alter the image
    if (declaration.property == "--experimental-image-edit") {
      let sel = csstree.generate(rule.ruleNode.prelude);
      sel = sel.replace('[data-id="', "#");
      sel = sel.replace('"]', "");
      let itemsList = sel.split(",");
      itemsList.forEach((elId) => {
        this.experimentalImageEdit.push(elId);
      });
    }
    // move the element to the next bit
    else if (declaration.property == "--experimental-push") {
      let sel = csstree.generate(rule.ruleNode.prelude);
      sel = sel.replace('[data-id="', "#");
      sel = sel.replace('"]', "");
      let itemsList = sel.split(",");
      itemsList.forEach((elId) => {
        this.pushblock.push([elId, declaration.value.value]);
      });
    } else if (declaration.property == "--experimental-fullpage") {
      let sel = csstree.generate(rule.ruleNode.prelude);
      sel = sel.replace('[data-id="', "#");
      sel = sel.replace('"]', "");
      let itemsList = sel.split(",");
      itemsList.forEach((elId) => {
        this.fullPageBackground.push([elId, declaration.value.value]);
      });
    }
    //experimental merge
    else if (declaration.property == "--experimental-merge") {
      let sel = csstree.generate(rule.ruleNode.prelude);
      sel = sel.replace('[data-id="', "#");
      sel = sel.replace('"]', "");
      let itemsList = sel.split(",");
      itemsList.forEach((elId) => {
        this.experimentalMerged.push([elId, declaration.value.value]);
      });
    }
    // page floats
    else if (declaration.property == "--experimental-page-float") {
      if (declaration.value.value.includes("same-top")) {
        let sel = csstree.generate(rule.ruleNode.prelude);
        sel = sel.replace('[data-id="', "#");
        sel = sel.replace('"]', "");
        this.floatSameTop.push(sel.split(","));
        // console.log("floatSameTop: ", this.floatSameTop);
      } else if (declaration.value.value.includes("same-bottom")) {
        let sel = csstree.generate(rule.ruleNode.prelude);
        sel = sel.replace('[data-id="', "#");
        sel = sel.replace('"]', "");
        this.floatSameBottom.push(sel.split(","));
        //console.log("floatSameBottom: ", this.floatSameBottom);
      } else if (declaration.value.value.includes("next-top")) {
        let sel = csstree.generate(rule.ruleNode.prelude);
        sel = sel.replace('[data-id="', "#");
        sel = sel.replace('"]', "");
        this.floatNextTop.push(sel.split(","));
        //console.log('floatNextTop: ', this.floatNextTop);
      } else if (declaration.value.value.includes("next-bottom")) {
        let sel = csstree.generate(rule.ruleNode.prelude);
        sel = sel.replace('[data-id="', "#");
        sel = sel.replace('"]', "");
        this.floatNextBottom.push(sel.split(","));
        //console.log("floatNextBottom: ", this.floatNextBottom);
      }
    }
    // spacing
    else if (declaration.property == "--experimental-spacing") {
      var spacingValue = declaration.value.value;
      spacingValue = spacingValue.replace(/\s/g, "");
      spacingValue = parseInt(spacingValue);
      let sel = csstree.generate(rule.ruleNode.prelude);
      sel = sel.replace('[data-id="', "#");
      sel = sel.replace('"]', "");
      var thisSpacing = [sel.split(","), spacingValue];
      this.spacing.push(thisSpacing);
    }
  }

  afterParsed(parsed) {
    if (this.pushblock.length > 0) {
      this.pushblock.forEach((elToPush) => {
        const elem = parsed.querySelector(elToPush[0]);
        if (!elem) {
          return;
        }

        elem.dataset.pushBlock = elToPush[1];
        let direction = "";
        if (elToPush[1] < 0) {
          direction = "back";
        }
        if (direction == "back") {
          for (let index = 0; index < Math.abs(elToPush[1]); index++) {
            if (elem.previousElementSibling) {
              elem.previousElementSibling.insertAdjacentElement(
                "beforebegin",
                elem
              );
            }
          }
        } else {
          for (let index = 0; index < Math.abs(elToPush[1]); index++) {
            if (elem.nextElementSibling) {
              elem.nextElementSibling.insertAdjacentElement("afterend", elem);
            }
          }
        }
      });
    }
    if (this.experimentalMerged.length > 0) {
      this.experimentalMerged.forEach((couple) => {
        const host = parsed.querySelector(couple[0]);
        const guest = parsed.querySelector(couple[1]);
        if (!host || !guest) {
          return;
        }
        guest.style.display = "none";
        host.classList.add("merged!");
        host.dataset.mergedGuest = guest.id;
        host.insertAdjacentHTML("beforeend", guest.innerHTML);
      });
    }
    if (this.experimentalImageEdit.length > 0) {
      this.experimentalImageEdit.forEach((elNBlist) => {
        parsed.querySelectorAll(elNBlist).forEach((img) => {
          img.classList.add("imageMover");

          // console.log("#" + img.id + ": image Mover");
        });
      });
    }
    if (this.floatNextBottom) {
      this.floatNextBottom.forEach((elNBlist) => {
        parsed.querySelectorAll(elNBlist).forEach((el) => {
          el.classList.add("page-float-next-bottom");
          // console.log("#" + el.id + " moved to next-bottom");
        });
      });
    }
    if (this.floatNextTop) {
      this.floatNextTop.forEach((elNBlist) => {
        parsed.querySelectorAll(elNBlist).forEach((el) => {
          el.classList.add("page-float-next-top");
          // console.log("#" + el.id + " moved to next-top");
        });
      });
    }
    if (this.floatSameTop) {
      this.floatSameTop.forEach((elNBlist) => {
        parsed.querySelectorAll(elNBlist).forEach((el) => {
          el.classList.add("page-float-same-top");
          // console.log("#" + el.id + " moved to same-top");
        });
      });
    }
    if (this.floatSameBottom) {
      this.floatSameBottom.forEach((elNBlist) => {
        parsed.querySelectorAll(elNBlist).forEach((el) => {
          el.classList.add("page-float-same-bottom");
          // console.log("#" + el.id + " moved to same-bottom");
        });
      });
    }
    if (this.spacing) {
      this.spacing.forEach((elNBlist) => {
        parsed.querySelectorAll(elNBlist[0]).forEach((el) => {
          var spacingValue = elNBlist[1];
          var spacingClass = "spacing-" + spacingValue;
          // console.log(spacingClass);
          el.classList.add(spacingClass);
          // console.log("#" + el.id + " spaced " + spacingValue);
        });
      });
    }
    if (this.fullPageBackground) {
      this.fullPageBackground.forEach((background) => {
        parsed.querySelectorAll(background[0]).forEach((el) => {
          el.classList.add("moveToBackgroundImage");
        });
      });
    }
  }
}

Paged.registerHandlers(CSStoClass);

//float top

// lets you manualy add classes to some pages elements
// to simulate page floats.
// works only for elements that are not across two pages

let classElemFloatSameTop = "page-float-same-top"; // â† class of floated elements on same page
let classElemFloatSameBottom = "page-float-same-bottom"; // â† class of floated elements bottom on same page

let classElemFloatNextTop = "page-float-next-top"; // â† class of floated elements on next page
let classElemFloatNextBottom = "page-float-next-bottom"; // â† class of floated elements bottom on next page

class elemFloatTop extends Paged.Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
    this.experimentalFloatNextTop = [];
    this.baseline = 22;
    this.experimentalFloatNextBottom = [];
    this.token;
  }

  layoutNode(node) {
    // If you find a float page element, move it in the array,
    if (node.nodeType == 1 && node.classList.contains(classElemFloatNextTop)) {
      let clone = node.cloneNode(true);
      this.experimentalFloatNextTop.push(clone);
      // Remove the element from the flow by hiding it.
      node.style.display = "none";
    }
    if (
      node.nodeType == 1 &&
      node.classList.contains(classElemFloatNextBottom)
    ) {
      let clone = node.cloneNode(true);
      this.experimentalFloatNextBottom.push(clone);
      // Remove the element from the flow by hiding it.
      node.style.display = "none";
    }

    if (
      node.nodeType == 1 &&
      node.classList.contains(classElemFloatSameBottom)
    ) {
      let clone = node.cloneNode(true);
      // this.experimentalFloatNextBottom.push(clone);
      // Remove the element from the flow by hiding it.
      node.style.display = "none";
    }
  }

  beforePageLayout(page, content, breakToken) {
    //console.log(breakToken);
    // If there is an element in the floatPageEls array,
    if (this.experimentalFloatNextTop.length >= 1) {
      // Put the first element on the page.
      page.element
        .querySelector(".pagedjs_page_content")
        .insertAdjacentElement("afterbegin", this.experimentalFloatNextTop[0]);
      this.experimentalFloatNextTop.shift();
    }
    if (this.experimentalFloatNextBottom.length >= 1) {
      // Put the first element on the page.
      page.element
        .querySelector(".pagedjs_page_content")
        .insertAdjacentElement(
          "afterbegin",
          this.experimentalFloatNextBottom[0]
        );
      this.experimentalFloatNextBottom.shift();
    }
  }

  layoutNode(node) {
    if (node.nodeType == 1) {
      if (node.classList.contains(classElemFloatSameTop)) {
        let clone = node.cloneNode(true);
        clone.classList.add("figadded");
        document
          .querySelector(".pagedjs_pages")
          .lastElementChild.querySelector("article")
          .insertAdjacentElement("afterbegin", clone);
        node.style.display = "none";
        node.classList.add("hide");
      }

      if (
        node.previousElementSibling?.classList.contains(classElemFloatSameTop)
      ) {
        let img = document
          .querySelector(".pagedjs_pages")
          .lastElementChild.querySelector(`.${classElemFloatSameTop}`);
        // console.log(img)
        // console.log(node)
        // if (img?.clientHeight) {
        //   // count the number of line for the image
        //   let imgHeightLine = Math.floor(img.clientHeight / this.baseline)
        //   // add one light and get the height in pixeol
        //   img.dataset.lineOffset = imgHeightLine + 0
        //   img.style.height = `${(imgHeightLine + 0) * this.baseline}px`
        // }
      }
    }
  }
  // works only with non breaked elements
  afterPageLayout(page, content, breakToken) {
    // try fixed bottom on same if requested
    if (page.querySelector("." + classElemFloatSameBottom)) {
      var bloc = page.querySelector("." + classElemFloatSameBottom);
      bloc.classList.add("absolute-bottom");
      bloc.classList.add("figadded");
    }

    // try fixed bottom if requested
    if (page.querySelector("." + classElemFloatNextBottom)) {
      var bloc = page.querySelector("." + classElemFloatNextBottom);
      bloc.classList.add("absolute-bottom");
      bloc.classList.add("figadded");
    }
  }
}
Paged.registerHandlers(elemFloatTop);

/* url cut*/

class expMerge extends Paged.Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
    this.experimentalMerged = [];
  }

  onDeclaration(declaration, dItem, dList, rule) {
    // alter the image
    //experimental merge
    if (declaration.property == "--experimental-merge") {
      let sel = csstree.generate(rule.ruleNode.prelude);
      sel = sel.replace('[data-id="', "#");
      sel = sel.replace('"]', "");
      let itemsList = sel.split(",");
      itemsList.forEach((elId) => {
        this.experimentalMerged.push([elId, declaration.value.value]);
      });
    }
  }

  beforeParsed(parsed) {
    if (this.experimentalMerged.length > 0) {
      this.experimentalMerged.forEach((couple) => {
        const host = parsed.querySelector(couple[0]);
        const guest = parsed.querySelector(couple[1]);
        if (!host || !guest) {
          return;
        }
        guest.style.display = "none";
        host.classList.add("merged!");
        host.dataset.mergedGuest = guest.id;
        host.insertAdjacentHTML("beforeend", guest.innerHTML);
      });
    }
  }
}

Paged.registerHandlers(expMerge);

class moveToParentFig extends Paged.Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
    this.moveToParentFig = [];
  }
  onDeclaration(declaration, dItem, dList, rule) {
    // move the element to the next bit
    if (declaration.property == "--experimental-moveToOutsideFigure") {
      let sel = csstree.generate(rule.ruleNode.prelude);
      sel = sel.replace('[data-id="', "#");
      sel = sel.replace('"]', "");
      let itemsList = sel.split(",");
      itemsList.forEach((elId) => {
        this.moveToParentFig.push([elId, declaration.value.value]);
      });
    }
  }
  beforeParsed(content) {
    if (this.moveToParentFig.length > 0) {
      this.moveToParentFig.forEach((elToPush) => {
        const elem = content.querySelector(elToPush[0]);
        if (!elem) {
          return;
        }
        let fighead = elem.querySelector("label").cloneNode(true);
        console.log("label", fighead);
        elem.insertAdjacentElement("beforeend", fighead);
        elem.closest("figure").insertAdjacentElement("afterend", elem);
      });
    }
  }
}
Paged.registerHandlers(moveToParentFig);

/** This is a rough draft 
async function formulaeTest(parsed) {
  const imagePromises = [];
  const paraImages = parsed.querySelectorAll("p img");
  paraImages.forEach((image) => {
    const img = new Image();
    let resolve, reject;
    const imageLoaded = new Promise(function (r, x) {
      resolve = r;
      reject = x;
    });

    img.onload = function () {
      const { widthClass, heightClass, ratioClass } = getSizeRatioClass(
        img.naturalWidth,
        img.naturalHeight
      );

      image.classList.add(widthClass, heightClass, ratioClass);

      const para = image.closest("p");

      for (child of para?.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE)
          para.classList.add(
            child.tagName === "IMG" ? "hasMultipleImages" : "hasOtherElem"
          );
        if (child.nodeType === Node.TEXT_NODE) para.classList.add("hasContent");
        if (para.matches(`p.hasMultipleImages.hasOtherElem.hasContent`)) break;
      }
      // console.log("loaded-------");
      para.classList.add("hasImage");
      resolve();
    };
    img.onerror = function () {
      reject();
    };

    img.src = image.src;

    imagePromises.push(imageLoaded);
  });
  try {
    return await Promise.all(imagePromises);
  } catch (err) {
    console.warn(err);
  }
}*/

function getSizeRatioClass(width, height) {
  return {
    widthClass: getSizeClass(width, "width"),
    heightClass: getSizeClass(height, "height"),
    ratioClass: getRatioClass(width / height),
  };
}
function getSizeClass(size, paramStr) {
  if (size <= 48) return `${paramStr}-40`;
  if (size <= 80) return `${paramStr}-80`;
  if (size <= 160) return `${paramStr}-160`;
  if (size <= 240) return `${paramStr}-240`;
  if (size <= 360) return `${paramStr}-360`;
  if (size <= 480) return `${paramStr}-480`;
  return `${paramStr}-480-above`;
}

function getRatioClass(ratio) {
  if (ratio >= 1.7) return "landscape";
  if (ratio <= 0.95) return "portrait";
  if (ratio < 1.39 || ratio > 0.95) return "square";
}

class fixMarginTop extends Paged.Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
    this.pagedone = false;
    let hasRenderedContent = false;
  }

  onPageLayout() {
    this.hasRenderedContent = false;
    this.pagedone = false;
  }

  renderNode(node) {
    if (this.pagedone == true) return;
    if (node.nodeType != 1) return;

    if (!this.hasRenderedContent) {
      this.hasRenderedContent = hasContent(node);
    }

    if (this.hasRenderedContent == true) {
      // check if the starting page is really at 0
      const wrapper = node
        .closest(".pagedjs_page_content")
        .querySelector("div");
      let wrapperOffsetTop = wrapper.offsetTop;
      if (wrapperOffsetTop != 0) {
        // console.log(wrapperOffsetTop);
        // console.log(wrapper.style.marginTop);
        // wrapper.style.position = `relative`
        // wrapper.style.marginTop = `-${wrapperOffsetTop}px`;
      }

      // console.log(wrapperOffsetTop);
    }
    this.pagedone = true;
  }

  // check if node is the first element
}

function isElement(node) {
  return node && node.nodeType === 1;
}

function isText(node) {
  return node && node.nodeType === 3;
}

function hasContent(node) {
  if (isElement(node)) {
    return true;
  } else if (isText(node) && node.textContent.trim().length) {
    return true;
  }
  return false;
}

Paged.registerHandlers(fixMarginTop);

function dispatchFigure(content) {
  content.querySelectorAll("figure").forEach((fig) => {
    // if there is no label keep the image together
    if (fig.classList.contains("no-label")) {
      return;
    }

    if (fig.querySelectorAll("img").length > 1) {
      // not to fill is not yet added.
      // we need to do that before anythin
      if (fig.classList.contains("nottofill")) {
        return;
      }

      // get the last figure
      let imageToMove = [...fig.querySelectorAll("img")];

      // Filter out images that are children of <figcaption> elements
      imageToMove = imageToMove.filter((img) => !img.closest("figcaption"));

      // create figures for sub images block
      for (let index = imageToMove.length; index > 1; index--) {
        const element = imageToMove[index - 1];

        // link figure
        fig.classList.add("has-continued");
        fig.dataset.continuedMain = `ctn-${fig.id}`;
        fig.insertAdjacentHTML(
          "afterend",
          `<figure data-continued-from="ctn-${
            fig.id
          }" class="added-figure-tofill tofill continuedContent" id="${
            fig.id
          }-cont-${index}"><figcaption><p data-brea-after="unset" class="continued"><span class="label figure-name">${
            fig?.querySelector(".label")
              ? fig.querySelector(".label").innerHTML
              : ""
          }</span> <span class="ctn">(continued)</span></p></figcaption>${
            element.outerHTML
          }</figure>`
        );
        element.remove();
      }
    }
  });
}

// if figure have multiple images, just put the image into following figures
// so <fig > img1 + img2
// becomes
// <fig > img1 > + fig img2 etc.
// add a class to those figure so they’re following the main process instead of being rendered as image outisde of figures
//
//

async function addWidthHeightToImg(parsed) {
  let imagePromises = [];
  let images = parsed.querySelectorAll("img");
  images.forEach((image) => {
    if (image.width && image.height) return;
    let img = new Image();
    let resolve, reject;
    let imageLoaded = new Promise(function (r, x) {
      resolve = r;
      reject = x;
    });

    img.onload = function () {
      let height = img.naturalHeight;
      let width = img.naturalWidth;
      image.setAttribute("height", height);
      image.setAttribute("width", width);

      let ratio = width / height;
      if (ratio >= 1.7) {
        image.classList.add("landscape");
        image.parentNode.classList.add("fig-landscape");
      } else if (ratio <= 0.95) {
        image.classList.add("portrait");
        image.parentNode.classList.add("fig-portrait");
      } else if (ratio < 1.39 || ratio > 0.95) {
        image.classList.add("square");
        image.parentNode.classList.add("fig-square");
      }
      resolve();
    };
    img.onerror = function () {
      reject();
    };

    img.src = image.src;

    imagePromises.push(imageLoaded);
  });
  return Promise.all(imagePromises).catch((err) => {
    console.warn("err", err);
  });
}

/*break after*/
// check if the element has a break after avoid and move it on next page
class avoidBreakAfter extends Paged.Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
  }

  finalizePage(pageFragment, page) {
    // remove any final emtpy element

    pageFragment.querySelectorAll("ol").forEach((ol) => {
      // remove any empty ol at the end of any page: if ol is the last element and is empty
      if (ol.textContent.length < 1 && ol.parentElement.lastChild == ol) {
        ol.remove();
      }
    });

    let possibleBreakAvoid = pageFragment.querySelectorAll(
      `[data-break-after="avoid"]`
    );

    let goodEl;

    possibleBreakAvoid.forEach((el) => {
      // if element hs been marked as having nothing after to stick to.

      if (el.classList.contains("no-el-next")) return;
      if (el.classList.contains("done")) return;
      // if (el.nextElementSibling) return;
      if (el.closest(".movedfig")) return;
      if (el.closest("figure")) return;
      if (el.parentElement.tagName == "FIGURE") {
        // .... there shouldnt be any figures anymore
      }
      // el.classList.add("touched")
      //

      if (
        !el.nextElementSibling &&
        !el.parentElement.nextElementSibling &&
        !el.tagName == "SECTION"
      ) {
        goodEl = el;

        // console.log(el.nextElementSibling);

        while (
          goodEl.previousElementSibling &&
          goodEl.previousElementSibling.dataset.breakAfter == "avoid"
        ) {
          goodEl.classList.add("toremove");
          goodEl = goodEl.previousElementSibling;
          debugger;
        }
      }
    });

    //if there is no element at the end keep going
    if (!goodEl) return;

    console.log("goodel", goodEl.dataset.ref);

    // console.log(page);
    const elementFromSource = this.chunker.source.querySelector(
      `[data-ref="${goodEl.dataset.ref}"]`
    );

    elementFromSource.dataset.breakAfter = "none";

    // elementFromSource.data

    while (goodEl.nextElementSibling) {
      goodEl.nextElementSibling.remove();
    }
    // goodEl.remove();

    // switch the breaktoken
    if (page.endToken) {
      page.breakToken = page.endToken.node = elementFromSource;
      page.breakToken = page.endToken.offset = 0;
    }
  }
}
Paged.registerHandlers(avoidBreakAfter);

function tagImgInFigures(content) {
  const figures = content.querySelectorAll("figure");
  figures.forEach((figure) => {
    //number of images
    figure.classList.add(`imgs-${figure.querySelectorAll("img").length}`);
    //
    // is there a title
    // TODO
    // figure.classList.add(`has-title`);
    // is there a caption

    if (
      !figure.querySelector("figcaption p") &&
      !figure.querySelector("label")
    ) {
      figure.classList.add("font");
      figure.classList.add("no-caption");
    }
    // how long is the caption
    // when the caption is less than 550, makes it one column

    let captionLength = 0;
    figure
      .querySelector("figcaption")
      ?.querySelectorAll("p, li")
      .forEach((el) => {
        captionLength = captionLength + el.textContent.length;
      });

    // console.log(figure.id, captionLength);
    if (captionLength < 800 && captionLength >= 500) {
      figure.classList.add("shortcaption");
    } else if (captionLength < 500) {
      figure.classList.add("shortercaption");
    } else {
      figure.classList.add("longcaption");
    }

    // if it’s a continued element, don’t show its name
    if (figure.querySelector(".ctn")) return;
  });
}

// To avoid a race condition between mathjax and paged-js
async function finalizeMathJax() {
  if (!window.MathJax || !MathJax.startup) {
    return;
  }
  await MathJax.startup.promise;
  
  if (MathJax.typesetPromise) {
    await MathJax.typesetPromise();
  }
  
  const doc = MathJax.startup.document;
  if (doc) {
    doc.clear();
    doc.updateDocument();
    if (doc.state) {
      doc.state(0);
    }
    await MathJax.typesetPromise();
  }
  
  await new Promise(resolve => setTimeout(resolve, 100));
}