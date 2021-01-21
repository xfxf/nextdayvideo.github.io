// Copyright 2021 Michael Farrell <micolous+git@gmail.com>
// License: Apache 2

"use strict";

const LOGO = document.getElementById('l');
const LOGO_PATH = LOGO.getElementsByTagName('path')[0] || LOGO.getElementsByTagName('circle')[0];
const LOGO_WIDTH = parseInt(LOGO.attributes.width.value);
const LOGO_HEIGHT = parseInt(LOGO.attributes.height.value);
var VECTOR_X = -1;
var VECTOR_Y = -1;
var LAST_COLOUR_CHANGE = 0;

// Colours that we can use.
const COLOURS = [
	'fuchsia',
	'red',
	'yellow',
	'lime',
	'cyan',
	'blue',
];

function randomColour() {
	const now = (new Date()).getTime();
	if (now < LAST_COLOUR_CHANGE + 2000) {
		// Don't change colours more than once per 2 seconds, to avoid
		// strobing effects.
		return;
	}
	LAST_COLOUR_CHANGE = now;

	// Make sure we get a different colour.
	var otherColours = COLOURS.filter(c => c != LOGO_PATH.style.fill);
	LOGO_PATH.style.fill = otherColours[Math.floor(Math.random() * otherColours.length)];
}

function moveIt() {
	// Find browser viewport bounds
	const height = window.innerHeight;
	const width = window.innerWidth;
	
	const curX = parseInt(LOGO.style.left);
	const curY = parseInt(LOGO.style.top);

	// Figure out what our new position would be, on the current vectors.
	var newX = curX + VECTOR_X;
	var newY = curY + VECTOR_Y;
	var collision = false;

	// See if we hit some edge.
	if (newX < 0) {
		// We hit the left edge.
		VECTOR_X = 1;
		newX = 0;
		collision = true;
	} else if (newX + LOGO_WIDTH > width) {
		// We hit the right edge.
		VECTOR_X = -1;
		newX = width - LOGO_WIDTH - 1;
		if (newX < 0) {
			// The viewport is not wide enough for the logo.
			newX = 0;
		}
		collision = true;
	}

	if (newY < 0) {
		// We hit the top edge.
		VECTOR_Y = 1;
		newY = 0;
		collision = true;
	} else if (newY + LOGO_HEIGHT > height) {
		// We hit the bottom edge.
		VECTOR_Y = -1;
		newY = height - LOGO_HEIGHT - 1;
		if (newY < 0) {
			// The viewport is not high enough for the logo.
			newY = 0;
		}
		collision = true;
	}

	// Set the new position of the element.
	LOGO.style.left = newX;
	LOGO.style.top = newY;
	
	// We colour change on collision.
	if (collision) {
		randomColour();
	}
}

setInterval(moveIt, 10);
