//  add this to the css
// .fixedLink {
//   list-style: revert !important;
// }

class removeEmptyLi extends Paged.Handler {
  async finalizePage(pageElement, pageObject, breaktoken) {
    console.log(breaktoken);
    const lastListItemInPage = [...pageElement.querySelectorAll("li")].pop();

    if (lastListItemInPage && lastListItemInPage.textContent.length < 1) {
      // set the break token to the previous li
      //
      // get the element from source
      const elementFromSource = this.chunker.source.querySelector(
        `[data-ref="${lastListItemInPage.dataset.ref}"]`
      );

      // change the breaktoken
      pageObject.endToken = {
        breakToken: {
          node: elementFromSource,
          offset: 0,
        },
      };

      elementFromSource.classList.add("fixedLink");

      // remove the empty li
      lastListItemInPage.remove();

      // return pageObject
    }
  }
}

Paged.registerHandlers(removeEmptyLi);
