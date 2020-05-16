/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

// class name for all text nodes added by this script.
const TEXT_DIV_CLASSNAME = 'tfjs_mobilenet_extension_text';

/**
 *  Returns a list of all DOM image elements pointing to the provided srcUrl.
 * @param {string} srcUrl which url to search for, including 'http(s)://'
 *     prefix.
 * @returns {HTMLElement[]} all img elements pointing to the provided srcUrl
 */
function getImageElementsWithSrcUrl(srcUrl) {
  const imgElArr = Array.from(document.getElementsByTagName('img'));
  const filtImgElArr = imgElArr.filter(x => x.src === srcUrl);
  return filtImgElArr;
}

/**
<<<<<<< HEAD
=======
 * Finds and removes all of the text predictions added by this extension, and
 * removes them from the DOM. Note: This does not undo the containerization.  A
 * cleaner implementation would move the image node back out of the container
 * div.
 */
function removeTextElements() {
  const textDivs = document.getElementsByClassName(TEXT_DIV_CLASSNAME);
  for (const div of textDivs) {
    div.parentNode.removeChild(div);
  }
}

async function fetchAsync(searchTerm) {
  const query = encodeURI(searchTerm);
  console.log(query);
  const response = await fetch(`https://www.bing.com/images/search?q=${query}`);
  return response;
}

/**
>>>>>>> 05aa2fc896bea41b8c9298a6819d63574d263939
 *  Moves the provided imgNode into a container div, and adds a text div as a
 * peer.  Styles the container div and text div to place the text
 * on top of the image.
 * @param {HTMLElement} imgNode Which image node to write content on.
 * @param {string} imageUrl What image to put on the old image.
 */
function addTextElementToImageNode(imgNode, textContent) {
  fetchAsync(textContent);
  imgNode.src = 'https://i.imgur.com/qC9mjQO.jpeg'  // TODO: Pass image URL once we have it
}

// Add a listener to hear from the content.js page when the image is through
// processing.  The message should contin an action, a url, and predictions (the
// output of the classifier)
//
// message: {action, url, predictions}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
<<<<<<< HEAD
  const imgElements = getImageElementsWithSrcUrl(message.url);
  for (const imgNode of imgElements) {
    const textContent = message.predictions[0].className;
<<<<<<< HEAD
    addTextElementToImageNode(imgNode, textContent);
=======
  if (message && message.action === 'IMAGE_CLICK_PROCESSED' && message.url &&
    message.predictions) {
    // Get the list of images with this srcUrl.
    const imgElements = getImageElementsWithSrcUrl(message.url);
    for (const imgNode of imgElements) {
      console.log(message.predictions[0])
      const textContent = message.predictions[0].className;
      addTextElementToImageNode(imgNode, textContent);
    }
  }
});

// Set up a listener to remove all annotations if the user clicks
// the left mouse button.  Otherwise, they can easily cloud up the
// window.
window.addEventListener('click', clickHandler, false);
/**
 * Removes text elements from DOM on a left click.
 */
function clickHandler(mouseEvent) {
  if (mouseEvent.button == 0) {
    removeTextElements();
>>>>>>> 05aa2fc896bea41b8c9298a6819d63574d263939
=======
    const first = textContent.split(",")[0]
    addTextElementToImageNode(imgNode, first);
>>>>>>> auto-classify
  }
});