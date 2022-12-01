// simplified array of styles
let localStyles = figma.getLocalPaintStyles().map(({ id, name }) => ({ id, name }));

// don't touch hidden layers
figma.skipInvisibleInstanceChildren = true;

// amount of layers that we failed to re-skin
let failed = 0;

// get current selection
const selection = figma.currentPage.selection;

// in case there are selected layers, apply local styles only to them, otherwise go through the whole document
if (selection.length >= 1) {
  iterateSelectionAndReplace(localStyles, selection)
} else {
  const nodes = figma.currentPage.findAllWithCriteria({
    types: ['BOOLEAN_OPERATION',
      'COMPONENT',
      'COMPONENT_SET',
      'ELLIPSE',
      'FRAME',
      'INSTANCE',
      'LINE',
      'POLYGON',
      'RECTANGLE',
      'SHAPE_WITH_TEXT',
      'STAR',
      'TEXT',
      'VECTOR',
      'GROUP']
  });
  replaceColors(localStyles, nodes)
}

if (failed) {
  figma.notify(`Mission complete! 💥 ${failed} ${failed > 1 ? 'styles were' : 'style was'} not reassigned`)
}
else {
  figma.notify(`🙌 Mission complete!`)
};

figma.closePlugin();



// FUNCTIONS

// when a layer can't be re-skinned, it is added to selection
function addNewNodeToSelection(page: PageNode, node: SceneNode) {
  page.selection = page.selection.concat(node)
}

// use this function to iterate through selection
async function iterateSelectionAndReplace(localStyles: any[], selection) {

  // reset selection, to use it for failed layers
  figma.currentPage.selection = [];

  for (const i in selection) {
    replaceColors(localStyles, [selection[i]])
    // iterate and add child nodes
    if ("children" in selection[i]) {
      const childrenNodes = selection[i].findAllWithCriteria({
        types: ['BOOLEAN_OPERATION',
          'COMPONENT',
          'COMPONENT_SET',
          'ELLIPSE',
          'FRAME',
          'INSTANCE',
          'LINE',
          'POLYGON',
          'RECTANGLE',
          'SHAPE_WITH_TEXT',
          'STAR',
          'TEXT',
          'VECTOR',
          'GROUP']
      });
      for (const child of childrenNodes) {
        replaceColors(localStyles, [child])
      }
    }
  }
}

// replace styles for all passed nodes
function replaceColors(localStyles: any[], nodes: any[]) {
  for (const node of nodes) {
    if ("fills" in node && node.fillStyleId !== '') {
      const tempStyle = { id: node.fillStyleId, name: figma.getStyleById(String(node.fillStyleId))?.name };

      if (localStyles.some(elem => elem.name === tempStyle.name)) {
        let localStyle = localStyles.find(elem => elem.name === tempStyle.name);
        if (localStyle) {
          if (localStyle?.id !== tempStyle.id) {
            node.fillStyleId = localStyle.id;
          }
        }
      } else if (node.type === 'TEXT' && typeof (node.fillStyleId) === 'symbol') {
        const uniqueTextColorStyles = node.getStyledTextSegments(['fills', 'fillStyleId']);

        for (const fillStyle of uniqueTextColorStyles) {
          //get the style currently applied to the node
          let originalStyle = figma.getStyleById(fillStyle.fillStyleId);

          //apply style if there is a match in local theme
          if (originalStyle !== null) {
            let localStyleObj = localStyles.find(elem => elem.name === originalStyle?.name);

            if (localStyleObj) {
              let localStyle = figma.getStyleById(localStyleObj.id);
              node.setRangeFillStyleId(fillStyle.start, fillStyle.end, localStyle?.id);
            }
          }
        }
      } else {
        failed++
        addNewNodeToSelection(figma.currentPage, node);
      }
    }
    if ("strokes" in node && node.strokeStyleId !== '') {
      const tempStyle = { id: node.strokeStyleId, name: figma.getStyleById(String(node.strokeStyleId))?.name };
      if (localStyles.some(elem => elem.name === tempStyle.name)) {
        let localStyle = localStyles.find(elem => elem.name === tempStyle.name);
        if (localStyle) {
          if (localStyle?.id !== tempStyle.id) {
            node.strokeStyleId = localStyle.id;
          }
        }
      } else {
        failed++
        addNewNodeToSelection(figma.currentPage, node)
      }
    }
  }
}