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

import 'babel-polyfill';
import * as tf from '@tensorflow/tfjs';
import {IMAGENET_CLASSES} from './imagenet_classes';

// Where to load the model from.
const MOBILENET_MODEL_TFHUB_URL =
    'https://tfhub.dev/google/imagenet/mobilenet_v2_100_224/classification/2'
// Size of the image expected by mobilenet.
const IMAGE_SIZE = 224;
// The minimum image size to consider classifying.  Below this limit the
// extension will refuse to classify the image.
const MIN_IMG_SIZE = 32;

// How many predictions to take.
const TOPK_PREDICTIONS = 1;
const FIVE_SECONDS_IN_MS = 5000;

function clickMenuCallback(_, tab) {
  chrome.tabs.executeScript(tab.id, {
    code: `let images = Array.from(document.images).map(x => x.src)
           chrome.runtime.sendMessage({ method: "downloadImages", images: images })` });
}

chrome.contextMenus.create({
  title: "make page shitty",
  contexts: ["page"],
  onclick: clickMenuCallback,
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.method == "downloadImages") {
    message.images.forEach((v) => {
      imageClassifier.analyzeImage(v)
    });
  }
});

/**
 * Async loads a mobilenet on construction.  Subsequently handles
 * requests to classify images through the .analyzeImage API.
 * Successful requests will post a chrome message with
 * 'IMAGE_CLICK_PROCESSED' action, which the content.js can
 * hear and use to manipulate the DOM.
 */
class ImageClassifier {
  constructor() {
    this.loadModel();
  }

  /**
   * Loads mobilenet from URL and keeps a reference to it in the object.
   */
  async loadModel() {
    console.log('Loading model...');
    const startTime = performance.now();
    try {
      this.model =
          await tf.loadGraphModel(MOBILENET_MODEL_TFHUB_URL, {fromTFHub: true});
      // Warms up the model by causing intermediate tensor values
      // to be built and pushed to GPU.
      tf.tidy(() => {
        this.model.predict(tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3]));
      });
      const totalTime = Math.floor(performance.now() - startTime);
      console.log(`Model loaded and initialized in ${totalTime} ms...`);
    } catch {
      console.error(
          `Unable to load model from URL: ${MOBILENET_MODEL_TFHUB_URL}`);
    }
  }

  async analyzeImage(url) {
    chrome.tabs.query({ active: true }, (tabs) => {
      const tabId = tabs[0].id
      if (!tabId) {
        console.error('No tab.  No prediction.');
        return;
      }
      if (!this.model) {
        console.log('Waiting for model to load...');
        setTimeout(() => { this.analyzeImage(url) }, FIVE_SECONDS_IN_MS);
        return;
      }
      let message;
      this.loadImage(url).then(
        async (img) => {
          if (!img) {
            console.error(
              'Could not load image.  Either too small or unavailable.');
            return;
          }
          const predictions = await this.predict(img);
          message = { action: 'IMAGE_CLICK_PROCESSED', url, predictions };
          chrome.tabs.sendMessage(tabId, message);
        },
        (reason) => {
          console.error(`Failed to analyze: ${reason}`);
        });
    })
  }

  /**
   * Creates a dom element and loads the image pointed to by the provided src.
   * @param {string} src URL of the image to load.
   */
  async loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.onerror = function(e) {
        reject(`Could not load image from external source ${src}.`);
      };
      img.onload = function(e) {
        if ((img.height && img.height > MIN_IMG_SIZE) ||
            (img.width && img.width > MIN_IMG_SIZE)) {
          img.width = IMAGE_SIZE;
          img.height = IMAGE_SIZE;
          resolve(img);
        }
        // Fail out if either dimension is less than MIN_IMG_SIZE.
        reject(`Image size too small. [${img.height} x ${
            img.width}] vs. minimum [${MIN_IMG_SIZE} x ${MIN_IMG_SIZE}]`);
      };
      img.src = src;
    });
  }

  /**
   * Sorts predictions by score and keeps only topK
   * @param {Tensor} logits A tensor with one element per predicatable class
   *   type of mobilenet.  Return of executing model.predict on an Image.
   * @param {number} topK how many to keep.
   */
  async getTopKClasses(logits, topK) {
    const {values, indices} = tf.topk(logits, topK, true);
    const valuesArr = await values.data();
    const indicesArr = await indices.data();
    console.log(`indicesArr ${indicesArr}`);
    const topClassesAndProbs = [];
    for (let i = 0; i < topK; i++) {
      topClassesAndProbs.push({
        className: IMAGENET_CLASSES[indicesArr[i]],
        probability: valuesArr[i]
      })
    }
    return topClassesAndProbs;
  }

  /**
   * Executes the model on the input image, and returns the top predicted
   * classes.
   * @param {HTMLElement} imgElement HTML element holding the image to predict
   *     from.  Should have the correct size ofr mobilenet.
   */
  async predict(imgElement) {
    console.log('Predicting...');
    // The first start time includes the time it takes to extract the image
    // from the HTML and preprocess it, in additon to the predict() call.
    const startTime1 = performance.now();
    // The second start time excludes the extraction and preprocessing and
    // includes only the predict() call.
    let startTime2;
    const logits = tf.tidy(() => {
      // Mobilenet expects images to be normalized between -1 and 1.
      const img = tf.browser.fromPixels(imgElement).toFloat();
      // const offset = tf.scalar(127.5);
      // const normalized = img.sub(offset).div(offset);
      const normalized = img.div(tf.scalar(256.0));
      const batched = normalized.reshape([1, IMAGE_SIZE, IMAGE_SIZE, 3]);
      startTime2 = performance.now();
      const output = this.model.predict(batched);
      if (output.shape[output.shape.length - 1] === 1001) {
        // Remove the very first logit (background noise).
        return output.slice([0, 1], [-1, 1000]);
      } else if (output.shape[output.shape.length - 1] === 1000) {
        return output;
      } else {
        throw new Error('Unexpected shape...');
      }
    });

    // Convert logits to probabilities and class names.
    const classes = await this.getTopKClasses(logits, TOPK_PREDICTIONS);
    const totalTime1 = performance.now() - startTime1;
    const totalTime2 = performance.now() - startTime2;
    console.log(
        `Done in ${totalTime1.toFixed(1)} ms ` +
        `(not including preprocessing: ${Math.floor(totalTime2)} ms)`);
    return classes;
  }
}

const imageClassifier = new ImageClassifier();
