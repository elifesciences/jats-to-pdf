// Define here the tags you want to give id
let tags = [
  "figure",
  "figcaption",
  "img",
  "ol",
  "ul",
  "li",
  "p",
  "img",
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
  tags?.forEach((tag) => {
    content?.querySelectorAll(tag)?.forEach((el, index) => {
      if (!el?.id) {
        el?.id = `el-${el?.tagName.toLowerCase()}-${index}`;
        total++;
      }
    });
  });
  console.log(`added ${total} ids!`);
}

export default addIDtoEachElement;
