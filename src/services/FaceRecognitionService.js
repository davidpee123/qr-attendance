// FaceRecognitionService.js
import * as tf from '@tensorflow/tfjs';
import * as faceapi from 'face-api.js';

let isInitialized = false;

const initializeFaceApi = async () => {
  if (isInitialized) return true;

  try {
    console.log("Initializing TensorFlow.js backend...");
    await tf.ready();

    try {
      await tf.setBackend('webgl');
      await tf.ready();
      console.log(" Using WebGL backend.");
    } catch (err) {
      console.warn(" WebGL not available, falling back to CPU:", err);
      await tf.setBackend('cpu');
      await tf.ready();
      console.log(" Using CPU backend.");
    }
    
    console.log("Loading facial recognition models...");
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    console.log(" All models loaded successfully.");

    isInitialized = true;
    return true;
  } catch (err) {
    console.error(" Failed to initialize Face-API:", err);
    isInitialized = false;
    return false;
  }
};

export { initializeFaceApi };