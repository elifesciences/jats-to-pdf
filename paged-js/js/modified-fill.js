// this script wil put any element with the property
// `position: fill page` on its own page while keeping the rest of the content flowing.
//
// use:
//
// ---===---===---
//
//   .elementToFill {
//     position: fill-page;
//   }
//
// ---===---===---
//
// the pagedjs-fillpage template is created by the script to manage the layout of the fullpage layout
//
//this will try to fill up the page with any image coming up from the content
//
//

const fillPageClass = "pagedjs-fill-next-page";

class fullpage extends Paged.Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
    this.fillPageElements = [];
    this.pushToNextPage = [];
    this.putThatFirst = [];
    this.needPage = [];
  }

  async onPageLayout(page, Token, layout) {
    if (this.putThatFirst.length > 1) {
      while (this.putThatFirst.length > 1) {
        // get the first element while removing it from the array
        const elem = this.putThatFirst.shift();

        // check if there is enough room to put the element, and make sure that it’s not a continuted figure,
        console.log("elem", elem);

        // if its an element that has continued figure, move it on the next page by default
        // if (elem.dataset.continuedMain) {
        //   this.needPage.push(elem);
        //   return;
        // } else if (elem.classList.includes("continuedContent")) {
        //   console.log(elem);
        //   this.needPage.push(elem);
        //   return;
        // } else
        if (
          (await getHeightOfHiddenElement(elem)) <
          (await getRemainingSpaceOnPage(page))
        ) {
          // check if there is enough room, otherwise add a page

          elem.className = "added-fig-post";
          elem.style.marginBottom = "17px";
          page.insertAdjacentHTML(
            "afterbegin",
            `<figure class="internalfig">${elem.innerHTML}</figure>`
          );
        } else {
          this.needPage.push(elem);
        } // then check if there is enough room on the page, other wise add a new one
      }
    }
  }

  // before parsed put the fig number as a span in the title for each figure (if it has h2/h3/h4)
  beforeParsed(content) {
    tagFigure(content);
  }

  //find from the css the element you wanna have  full page
  onDeclaration(declaration, dItem, dList, rule) {
    if (declaration.property == "position") {
      if (declaration.value.children.head.data.name.includes("fill-page")) {
        let sel = csstree.generate(rule.ruleNode.prelude);
        this.fillPageElements.push(sel.split(","));
      }
    }
  }

  async afterParsed(parsed) {
    // // get the size for the image
    // add the width and height to the image as attribute to get more data about what they are
    await addWidthHeightToImg(parsed);
    await calculateDesiredWidthPercentages(parsed.querySelectorAll(" img"));

    // try to see if an image is less than 50 px ans assume it’s math
    parsed.querySelectorAll("img").forEach((img) => {
      if (
        img.height &&
        img.height < 400 &&
        !img.closest("figure")?.id.includes("tbl")
      ) {
        img.classList.add("probablyMath");
      }
      if (img.height && img.height < 200) {
        if (img.closest("figure")) {
          if (
            img.closest("figure").classList.contains("continuedContent") ||
            img.closest("figure").dataset.continuedMain
          )
            return;
          img.closest("figure")?.classList.remove(fillPageClass);
          // img.closest("figure").remove();
        }
      }
    });

    parsed.querySelectorAll(".probablyMath").forEach((img) => {
      // if (img.closest("figure")) {
      //   return;
      // }

      // console.log(img);

      // for those image, we should remove the max-width
      // if (img.height < 20) {
      //   img.classList.add("formula-max-20")
      // }
      // if (img.height < 40) {
      //   img.classList.add("formula-max-40")
      // }
      // else if (img.height >= 40 && img.height < 80) {
      //   img.classList.add("formula-max-80")
      // }
      // else if (img.height >= 80 && img.height < 100) {
      //   img.classList.add("formula-max-100")
      // }
      // else if (img.height >= 100 && img.height < 140) {
      //   img.classList.add("formula-max-140")
      // }
      // else if (img.height >= 140 && img.height < 180) {
      //   img.classList.add("formula-max-180")
      // }
      // else if (img.height >= 180 && img.height < 240) {
      //   img.classList.add("formula-max-240")
      // }
      // else if (img.height >= 240 && img.height < 300) {
      //   img.classList.add("formula-max-300")
      // }

      for (let i = 0; i <= 400; i += 20) {
        if (img.height > i - 10 && img.height <= i + 10) {
          img.classList.add(`formula-max-${i}`);
          break;
        }
      }
    });

    //find from the css the element you wanna have  full page
    if (("this", this.fillPageElements)) {
      this.fillPageElements.forEach((selector) => {
        parsed.querySelectorAll(selector).forEach((el) => {
          //   if (
          //     !el.querySelector("img").closest("figcaption") &&
          //     el.querySelector("img").height < 150 &&
          //     !el
          //       .querySelector("img")
          //       .closest("figure")
          //       .classList.contains("continuedContent")
          //   )
          //   return el.closest("figure").classList.remove("tofill");

          // check when a new element is added, remove it if it has dataset.continuedMain

          // else add fill page class
          el.classList.add(fillPageClass);
          el.style.display = "none";
        });
      });
    }
  }

  // for column safety
  async finalizePage(pageFragment, oldpage) {
    // if (pageFragment.classList.contains("pagedjs_pagedjs-filler_page"))
    //   return;

    // if (this.needPage.length > 1) {
    // while (this.needPage.length > 1) {
    //   const elem = this.needPage.shift()
    //   elem.style.display = "block"
    //   let newPage = this.chunker.addPage();
    //   newPage.element.querySelector(".pagedjs_page_content").insertAdjacentElement("afterbegin", elem);
    // }
    // } else {

    // if the page has no element with the fillpageclass
    if (!oldpage.element.querySelector(`.${fillPageClass}`)) return;

    // console.log("page without anything to push to the nextpage");
    // else push that element to next full page
    // console.log("pushing");
    // push it to the next page
    pushItToNextFullPage(
      pageFragment,
      oldpage,
      this.chunker,
      this.putThatFirst
    );
    // }
  }

  afterRendered(pages) {
    document
      .querySelectorAll(".pagedjs_pagedjs-filler_page")
      .forEach((page) => {
        // check if the page has only one figure
        if (page.querySelectorAll("figure").length > 1) {
          // check if there is a continued element, link them together

          let addedElements = page.querySelectorAll(".continuedContent");

          addedElements.forEach((addedEl) => {
            // only do it if there is a figure before
            if (addedEl.previousElementSibling) {
              console.log(addedEl);
              addedEl.previousElementSibling.insertAdjacentElement(
                "beforeend",
                addedEl.querySelector("img")
              );
              addedEl.remove();
            }
          });

          let figures = page.querySelectorAll("figure");

          figures.forEach((fig) => {
            // reorder images and captions
            fig.classList.add("finishes2");
            fig.insertAdjacentElement(
              "beforeend",
              fig.querySelector("figcaption")
            );
          });
        } else if (page.querySelectorAll("figure").length < 2) {
          // try to show everything so the cal is good
          // page.querySelector(".pagedjs_page_content").style.overflow =
          //   "visible";

          page.querySelector("figure").classList.add("finishes");

          // fix the height of elements
          //get page height,
          const pageHeight = page.querySelector(
            ".pagedjs_page_content"
          ).offsetHeight;

          const figureHeight = page.querySelector("figure").offsetHeight;

          //make image bigger if the page has more roome
          if (figureHeight > pageHeight) {
            let img = page.querySelector(" figure > img");

            let captionHeight = page.querySelector("figcaption")
              ? page.querySelector("figcaption").offsetHeight
              : 0;

            let finalHeight = Math.abs(pageHeight - captionHeight);
            img.style.height = `${finalHeight - 34}px`;
            img.style.maxWidth = "100%";
            img.style.width = "auto";
            img.style.objectFit = "contain";
            // img.style.objectPosition= "left bottom"
          } else if (figureHeight > pageHeight) {
            //reduce img.
            let img = page.querySelector("img");

            // img.style.height = `${img.offsetHeight}px`;
            let captionHeight = page.querySelector("figcaption")
              ? page.querySelector("figcaption").offsetHeight
              : 0;

            let finalHeight = Math.abs(pageHeight - captionHeight);

            img.style.height = `${finalHeight - 34}px`;
            // img.style.width = `auto`;
            img.style.margin = " 0 auto";
            img.style.display = "block";
            //check if the image is out of the page
            //reduce the image size
          }
        }

        //set all page filler as grid
        page.classList.add("page-grid");
      });
  }
}

Paged.registerHandlers(fullpage);

async function pushItToNextFullPage(
  pageFragment,
  oldpage,
  chunker
  // putthatfirst
) {
  //make sure you’re not checkintg the added page
  // script to run in the async finalize page
  if (oldpage.element.classList.contains("addedpage")) {
    return console.log("dont run the page twice");
  }

  // try to put to the next page, if there is not enough room, create a new page until the element is empty

  // the spread operator to get the list of all the element to push to the next page
  let elementsList = [...pageFragment.querySelectorAll(`.${fillPageClass}`)];

  while (elementsList.length > 0) {
    let element = elementsList[0];
    const elementHeight = await getHeightOfHiddenElement(element);
    const pageHeight = window.getComputedStyle(getLastPage()).height;

    if (elementHeight < pageHeight) {
      //then let the page continue and add it add the top of the next page, and dont do anything with the rest of the array
      // putthatfirst.push(element);
      // elementsList.shift();
      // // return;
      // continue;
    }

    // if (element.querySelectorAll("img").length > 1) {
    // do something if there is more than 1 image in there
    //
    // elementsList.shift();
    // continue;
    // }

    // check if the last page has a class of
    // pagedjs_pagedjs-filler_page

    // check if the last page
    const lastpage = getLastPage();

    //if the last page contains the classsName of an added page
    if (lastpage.classList.contains("pagedjs_pagedjs-filler_page")) {
      // console.log(lastpage);
      // a page exist with a filler class
      //show the element hidden before
      element.style.display = "block";
      // elementsList[0].style.position = "unset";

      // let see how much space is left
      const remainingSpace = await getRemainingSpaceOnPage(
        lastpage.querySelector(".pagedjs_page_content")
      );
      const elementHeight = await getHeightOfHiddenElement(element);

      // console.log(remainingSpace, elementHeight, element);

      // if there is enough space, put the block
      if (remainingSpace > elementHeight && !element.dataset.continuedMain) {
        lastpage
          .querySelector(".pagedjs_page_content")
          .insertAdjacentElement("beforeend", element);
      } else {
        // otherwise create a new page
        const newpage = await chunker.addPage();

        // emulate the beforepage lyout to add the page to the flow pagedjs is waiting for
        await chunker.hooks.beforePageLayout.trigger(
          newpage,
          undefined,
          undefined,
          chunker
        );

        // tell pagedjs that a new page has been set
        chunker.emit("page", newpage);

        newpage.element.classList.add("pagedjs_pagedjs-filler_page");
        newpage.element
          .querySelector(".pagedjs_page_content")
          .insertAdjacentElement("beforeend", element);
        // create a new page and fill it up
      }

      // create a new page and fill it up
    } else if (!lastpage.classList.contains("pagedjs_pagedjs-filler_page")) {
      //prepare the elements
      element.style.display = "block";
      element.style.position = "unset";

      const newpage = await chunker.addPage();
      newpage.element.classList.add("pagedjs_pagedjs-filler_page");
      newpage.element
        .querySelector(".pagedjs_page_content")
        .insertAdjacentElement("afterbegin", element);
      // create a new page and fill it up
    } else {
      console.log("there is no new page damn");
    }

    // do the next figure
    elementsList.shift();
  }
}

async function addWidthHeightToImg(content) {
  let imagePromises = [];
  let images = content.querySelectorAll("img");
  images.forEach((image) => {
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
  const children = element.children;
  let lastBlockOffsetBottom = 0;

  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];

    // Check if the child is a block-level element (by checking it’s display)
    const display = window.getComputedStyle(child).display;
    // if (display === "block") {
    // Calculate the cumulative offset bottom
    const childOffsetBottom = child.offsetTop + child.offsetHeight;

    // Update the last block offset bottom if it's greater
    if (childOffsetBottom > lastBlockOffsetBottom) {
      lastBlockOffsetBottom = childOffsetBottom;
    }

    // Recursively check nested elements
    const nestedBlockOffsetBottom = getLastBlockOffsetBottom(child);
    if (nestedBlockOffsetBottom > lastBlockOffsetBottom) {
      console.log(nestedBlockOffsetBottom);
      console.log(lastBlockOffsetBottom);
      lastBlockOffsetBottom = nestedBlockOffsetBottom;
    }
    // }
  }

  // return the offset bottom in px (number)
  return lastBlockOffsetBottom;
}
async function getRemainingSpaceOnPage(page, security = 40) {
  // console.log(page);
  const parentHeight = parseInt(window.getComputedStyle(page).height);
  let result = parentHeight - getLastBlockOffsetBottom(page) - security;
  // console.log("result", result);
  return result;
}

function tagFigure(content) {
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
    //
    if (!figure.querySelector("h3")) return;
    if (figure.querySelector(".ctn")) return;

    // figure.insertAdjacentHTML(
    //   "afterend",
    //   `<p class="sendtolink">See ${figure
    //     .querySelector("h3").innerHTML}</p>`
    // );
  });
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

async function calculateDesiredWidthPercentages(images) {
  // Find the width of the largest image
  let largestWidth = 0;
  images.forEach((image) => {
    const width = image.width;
    if (width > largestWidth) {
      largestWidth = width;
    }
  });

  // Calculate the desired width percentage for each image and set as data attribute
  // and set the width style
  images.forEach((image) => {
    if (image.closest("figcaption")) return;
    const widthPercentage = (image.width / largestWidth) * 100;
    image.setAttribute("data-desired-width", widthPercentage);
    // image.style.maxWidth = `${Math.round(widthPercentage)}%`;

    // console.log(widthPercentage);

    if (widthPercentage <= 100) {
      maxwidth = "max-100";
    }
    if (widthPercentage <= 95) {
      maxwidth = "max-90";
    }
    if (widthPercentage <= 85) {
      maxwidth = "max-80";
    }
    if (widthPercentage <= 75) {
      maxwidth = "max-70";
    }
    if (widthPercentage <= 65) {
      maxwidth = "max-60";
    }
    if (widthPercentage <= 55) {
      maxwidth = "max-50";
    }
    if (widthPercentage <= 45) {
      maxwidth = "max-40";
    }
    if (widthPercentage <= 35) {
      maxwidth = "max-30";
    }
    if (widthPercentage <= 25) {
      maxwidth = "max-20";
    }
    if (widthPercentage <= 15) {
      maxwidth = "max-10";
    }

    image.classList.add(maxwidth);

    if (image.parentElement.tagName == "P") {
      //dont add max-width to image that are inside paragraphs. they should stick for 100% max
      // otherwise they will get hacked by the list
      // image.style.maxWidth = `${Math.round(widthPercentage) + 20}%`;
    }
  });

  // Return the modified array of image elements
  return images;
}

async function getHeightOfHiddenElement(element) {
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

  // get margin in case there are somex
  let margins = clone.style.marginTop + clone.style.marginBottom;

  let elementHeight = clone.offsetHeight + margins;
  clone.remove();
  return elementHeight;
}

async function putOnPage(element, page) {
  // check if there is enough room to put an element on that page
  let availableSpace = getRemainingSpaceOnPage(page);

  // you can’t know the right width and hwgiht of the element because it’s never been rendered.
  // option1 : set a position: absolute; top: 0, leftz. 0, check its size
  // render a clone of the element to get the height of the element
  let elHeight = await getHeightOfHiddenElement(element);

  // if there is enough room on the page
  if (availableSpace > elHeight) {
    const clone = element.cloneNode(true);
    lastpage
      .querySelector(".pagedjs_page_content")
      .insertAdjacentElement("afterbegin", clone);
    return true;
  }
}
