// src/services/FaceApiService.js
import * as tf from "@tensorflow/tfjs";
import * as faceapi from "face-api.js";

let isInitialized = false;
let initializationPromise = null;

const initializeFaceApi = async () => {
  if (isInitialized) {
    return true;
  }
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = new Promise(async (resolve, reject) => {
    // Only run this code on the client side
    if (typeof window === 'undefined') {
      console.log("Skipping Face-API initialization on the server.");
      isInitialized = false;
      resolve(false);
      return;
    }

    try {
      console.log("🔄 Initializing TensorFlow.js...");
      await tf.ready();

      // Explicitly try and fail on WebGL to ensure fallback
      try {
        await tf.setBackend("webgl");
        await tf.ready();
        console.log("✅ Using WebGL backend");
      } catch (err) {
        console.warn("⚠️ WebGL not available or supported, switching to CPU:", err);
        await tf.setBackend("cpu");
        await tf.ready();
        console.log("⚡ Using CPU backend");
      }
      
      const currentBackend = tf.getBackend();
      if (!currentBackend) {
          throw new Error("No TensorFlow.js backend could be initialized.");
      }
      console.log(`Current active backend: ${currentBackend}`);

      // Load models
      console.log("⬇️ Loading face-api models...");
      const MODEL_URL = "/models";
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

      console.log("✅ All models loaded successfully");
      isInitialized = true;
      resolve(true);
    } catch (error) {
      console.error("❌ Failed to initialize Face-API:", error);
      reject(error);
    } finally {
      initializationPromise = null;
    }
  });

  return initializationPromise;
};

const getFaceApi = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return faceapi;
};

export { initializeFaceApi, getFaceApi };