// Better Paste

/*
  Author: Ken Moore
  Date: March 5, 2017
  Version: 1.0

  Paste like it was meant to be--into the area you're viewing.
  Better Paste determines which area of which artboard is centered 
  in your view and pastes right there, not some at some random
  area or artboard far away.
*/

// Global variables
var scrollOrigin;
var zoomValue;
var page;
var artboards;
var doc;
var selection;

var betterPaste = function(context) {

	initEnvironment(context);

	// Determine if the user is currently editing a text field
	var userIsEditingText = false;
	var selectedLayer = null;
	if (selection) {
	  var selectedLayer = selection.firstObject();
	  if (selectedLayer && selectedLayer.isKindOfClass(MSTextLayer) && [selectedLayer isEditingText]) {
	    userIsEditingText = 1;
	  }
	}

	if ([artboards count] == 0 || userIsEditingText) {
	  // if the doc has no artboards OR the user is editing a text field, just
	  // paste the item(s) in the clipboard using the standard Paste action
	  [NSApp sendAction:'paste:' to:nil from:doc];
	} else {  
	  // Get the artboard nearest to the current view
	  var targetArtboard = getInViewArtboard();

	  // Compare inViewArtboard to selected artboard, only change artboard selection if different
	  // or if no layers are selected (as can happen when you tab away and back)
	  var currentArtboardIsTarget = (targetArtboard == [page currentArtboard]);

	  if (!currentArtboardIsTarget || !selectedLayer) {
	    // Deselect all layers
		context.api().selectedDocument.selectedPage.selectedLayers.clear();

	    // Select the in-view artboard
 		targetArtboard.select_byExpandingSelection(true, true);
	  }

	  // Paste the item(s) in the clipboard
	  [NSApp sendAction:'paste:' to:nil from:doc];

	  // get bounding rect for pasted selection
	  var leftmost, rightmost, topmost, bottommost;
	  selectedLayers = doc.selectedLayers();

	  for (var i = 0; i < selectedLayers.length; i++) {
	    layer = selectedLayers[i];
	    frame = [layer  frame];

	    if (i == 0 || (frame.x() < leftmost)) {
	      leftmost = frame.x();
	    }

	    if (i == 0 || (frame.x() + frame.width() > rightmost)) {
	      rightmost = frame.x() + frame.width();
	    }

	    if (i == 0 || (frame.y() < topmost)) {
	      topmost = frame.y();
	    }

	    if (i == 0 || (frame.y() + frame.height() > bottommost)) {
	      bottommost = frame.y() + frame.height();
	    }
	  }

	  // get bounding rect for viewport
	  artboardRect = [targetArtboard absoluteRect];
	  viewportX1 = (viewportFrame.origin.x - scrollOrigin.x) / zoomValue - [artboardRect x];
	  viewportY1 = (viewportFrame.origin.y - scrollOrigin.y) / zoomValue - [artboardRect y];
	  viewportX2 = (viewportFrame.origin.x + viewportWidth / zoomValue) - scrollOrigin.x / zoomValue - [artboardRect x];
	  viewportY2 = (viewportFrame.origin.y + viewportHeight / zoomValue) - scrollOrigin.y / zoomValue - [artboardRect y];


	  // If the pasted content is entirely out of the viewport, move it to be centered within the viewport
	  // (the system will paste in the center of the artboard if the bounding box of the default paste location
	  //   extends out of the current viewport)
	  if (rightmost < viewportX1 || bottommost < viewportY1 || leftmost > viewportX2 || topmost > viewportY2) {
	    // move all selected layers by the offset
	    var xOffset = (viewportX1 - (leftmost + rightmost) / 2 + (viewportWidth / zoomValue) / 2);
	    var yOffset = (viewportY1 - (bottommost + topmost) / 2 + (viewportHeight / zoomValue) / 2);
	    for(var i = 0; i < selectedLayers.length(); i++) {
	      layer = selectedLayers[i];
	      frame = [layer frame];
	      [frame addX: xOffset];
	      [frame addY: yOffset];
	    }
	  }

	}

	// zoomToFitRect has this lame outcome: if switching to a new artboard it forces zoom to the center of the artboard.
	// So using centerRect instead
	var originalViewportRect = NSMakeRect(-scrollOrigin.x / zoomValue, -scrollOrigin.y / zoomValue, viewportWidth / zoomValue, viewportHeight / zoomValue);
	[[doc contentDrawView] centerRect: originalViewportRect];
}

function initEnvironment(context) {
  // Get origin of the canvas and current zoom factor
  doc = context.document;
  selection = context.selection;
  scrollOrigin = [doc scrollOrigin];
  zoomValue = [doc zoomValue];

  page = [doc currentPage];
  artboards = [page artboards];
}


// Get the in-view artboard (closest to the center of the viewport)
function getInViewArtboard() {
  // Get the dimensions of the viewport
  view = [doc contentDrawView];
  viewportFrame = [view frame];
  viewportWidth = viewportFrame.size.width;
  viewportHeight = viewportFrame.size.height;

  // Calculate the coordinates of the midpoint of the viewport (in Viewport coordinate space)
  viewportCenterX = (viewportWidth / 2 - scrollOrigin.x) / zoomValue;
  viewportCenterY = (viewportHeight / 2 - scrollOrigin.y) / zoomValue;

  // See which artboard (if any) includes the center point of the viewport
  var inViewArtboardIndex = 0;  // initialize to the first artboard
  var minDistance = 1000000;  // to calculate closest artboard in case none include the center point of the viewport
  for(var i = 0; i < [artboards count]; i++) {
    artboard = [artboards objectAtIndex: i];
    artboardRect = [artboard absoluteRect];

    // If artboard contains center point, we're done searching
    if ([artboardRect x] < viewportCenterX && [artboardRect x] + [artboardRect width] > viewportCenterX && [artboardRect y] < viewportCenterY && [artboardRect y] + [artboardRect height] > viewportCenterY) {
        inViewArtboardIndex = i;
        break;
    } else {
      // Calculate sum of x offset and y offset from the center of the artboard to the center of the viewport
      distance = Math.abs(viewportCenterX - ([artboardRect x] + [artboardRect width] / 2)) + Math.abs(viewportCenterY - ([artboardRect y] + [artboardRect height] / 2));

      // If it's shorter than the current minimum, then it's the new choice for nearest
      if (distance < minDistance) {
        inViewArtboardIndex = i;
        minDistance = distance;
      }
    }
  }

  return [artboards objectAtIndex: inViewArtboardIndex];;
}


