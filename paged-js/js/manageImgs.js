import {
  fillPageClass,
  getHeightOfHiddenElement,
  getRemainingSpaceOnPage,
} from "./pagedjs-fill-page";


class manageImgs extends Paged.Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
    this.pushFigNextPage = [];
  }

  async onPageLayout(page, Token, layout) {
    const figures = page.querySelectorAll("figure");

    figures?.forEach(async (fig) => {
      const images = fig.querySelectorAll("img");

      // if the figure has no image, do nothing
      if (!images?.length) return;
      // if figure has more than 1 image push the whole figure to next page
      // todo: check for remaining space in page before pushing
      if (images.length > 1) this.pushFigNextPage.push(fig);
      const remainingSpace = await getRemainingSpaceOnPage(page);
      const imgHeight = await getHeightOfHiddenElement(images[0]);
      const figureHeight = await getHeightOfHiddenElement(images[0]);
      // if image height is less than the remainingSpace do nothing
      //todo: consider figure height so that figcaption doesn't break away from img
      if (imgHeight <= remainingSpace) return;

      // // if 80% of image height is less than the remainingSpace, reduce the size of the image to 80%
      // if (imgHeight * 0.8 <= remainingSpace) {
      //   images[0].style.height = imgHeight * 0.8;
      // }

      // else push the figure to next page
      this.pushFigNextPage.push(fig);
    });
  }
}

Paged.registerHandlers(manageImgs);
/**
 *  renderNode/layoutNode -> check if it has class fillPageClass
 *  const requiredSpace = height(element)
 *  1.requiredSpace < remainingPageHeight -> return
 *  2. a. requiredSpace > remainingPageHeight * .80 -> put element on a separate page (use finalizePage) (we create new page in our own)
 *     b. requiredSpace > remainingPageHeight -> add it to the next page array (wait for pagedJs to create new page and add it there)
 * 
 *  element should be display none for point 2
 * 
 */