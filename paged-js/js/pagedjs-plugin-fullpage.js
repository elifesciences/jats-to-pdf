// this script wil put any element with the property
// `position: fullpage` on its own page while keeping the rest of the content flowing.
//
// use:
//
// ---===---===---
//
//   img {
//     position: fullpage;
//     width: 100%;
//     height: 100%;
//     object-fit: cover;
//     display: block;
//   }
//   @page pagedjs-fullpage {
//     background: orange;
//     margin: 40px 100px 50px 12px;
//   }
//
// ---===---===---
//
// the pagedjs-fullpage template is created by the script to manage the layout of the fullpage layout
//
//
//

let classElemFullPage = "pagedjs-full-page"; // ← class of full page images

class fullpage extends Paged.Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
    this.floatFullPage = [];
    this.pushToNextPage = [];
  }

  //find from the css the element you wanna have  full page
  onDeclaration(declaration, dItem, dList, rule) {
    if (declaration.property == "position") {
      if (declaration.value.children.head.data.name.includes("fullpage")) {
        let sel = csstree.generate(rule.ruleNode.prelude);
        sel = sel.replace('[data-id="', "#");
        sel = sel.replace('"]', "");
        this.floatFullPage.push(sel.split(","));
      }
    }
  }

  //find from the css the element you wanna have  full page
  afterParsed(content) {
    if (("this", this.floatFullPage)) {
      this.floatFullPage?.forEach((selector) => {
        content?.querySelectorAll(selector)?.forEach((el) => {
          el?.classList.add(classElemFullPage);
          if(el.classList.contains("no-label") && el.classList.contains("no-caption")) {
            // console.log(el)
            return
          }
        });
      });
    }
  }

  renderNode(node, nodeTemplate) {
    if (node.nodeType != 1) return;
    if (node.classList.contains(classElemFullPage)) {
      // hide the element
      node.style.display = "none";
    }
  }

  // for column safety
  async finalizePage(pageFragment, oldpage) {
    // console.log(oldpage.element?.querySelector(classElemFullPage));
    if (!oldpage.element?.querySelector(`.${classElemFullPage}`))
      return console.log("page without fullpage element");
    pushItToNextFullPage(pageFragment, oldpage, this.chunker);
  }
}

Paged.registerHandlers(fullpage);

async function pushItToNextFullPage(pageFragment, oldpage, chunker) {
  //make sure you’re not checkintg the added page
  if (oldpage.element?.classList.contains("addedpage")) {
    return console.log("dont run the page twice");
  }

  // the spread operator is genius
  let elementsList = [
    ...pageFragment?.querySelectorAll(`.${classElemFullPage}`),
  ];

  // create a page for each new image

  elementsList?.forEach(async (el) => {
    console.log(el)
    let newpage = chunker.addPage();
    newpage.element?.classList.add("addedpage");
    newpage.element?.classList.add("pagedjs_named_page");
    newpage.element?.classList.add("pagedjs_pagedjs-fullpage_page");

    // create a new page
    // emulate the beforepage lyout to add the page to the flow pagedjs is waiting for
    await chunker.hooks.beforePageLayout.trigger(
      newpage,
      undefined,
      undefined,
      chunker
    );
    chunker.emit("page", newpage);

    // create the wrapper
    const wrapper = document.createElement("div");
    wrapper.classList.add("pagedjs-fullpage-element");

    // fill the wrapper
    elementsList?.forEach((el) => {
      let clone = el?.cloneNode(true);
      clone.style.display = "unset";
      wrapper.insertAdjacentHTML("beforeend", `${clone.outerHTML}`);
    });

    // //import the wrapper on the page
    newpage.element
      ?.querySelector(".pagedjs_page_content")
      ?.insertAdjacentElement("beforeend", wrapper);

    // emulate the finalize page to add the running boxes
    await chunker.hooks.afterPageLayout.trigger(
      newpage.element,
      newpage,
      undefined,
      chunker
    );
    await chunker.hooks.finalizePage.trigger(
      newpage.element,
      newpage,
      undefined,
      chunker
    );
    chunker.emit("renderedPage", newpage);
  });

  //
  //
}

// lets you manualy add classes to some pages elements
// to simulate page floats.
// works only for elements that are not across two pageH
