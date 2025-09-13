import * as tf from '@tensorflow/tfjs';
import * as faceapi from 'face-api.js';
import { useState } from 'react';

export const useFaceModels = () => {
  const [status, setStatus] = useState("Idle");

  const loadModels = async () => {
    try {
      setStatus("🔄 Initializing TensorFlow.js...");
      await tf.ready();

      // Try WebGL first, fallback to CPU if needed
      try {
        await tf.setBackend('webgl');
        await tf.ready();
        setStatus("✅ Using WebGL backend");
      } catch (err) {
        console.warn("⚠️ WebGL not available, falling back to CPU:", err);
        await tf.setBackend('cpu');
        await tf.ready();
        setStatus("⚡ Using CPU backend");
      }

      // Load models with progress messages
      setStatus("⬇️ Loading SSD Mobilenetv1 model...");
      await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');

      setStatus("⬇️ Loading Face Landmark 68 model...");
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');

      setStatus("⬇️ Loading Face Recognition model...");
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

      // ✅ Check if models actually loaded
      console.log("SSD Mobilenet loaded:", faceapi.nets.ssdMobilenetv1.isLoaded);
      console.log("Landmark68 loaded:", faceapi.nets.faceLandmark68Net.isLoaded);
      console.log("RecognitionNet loaded:", faceapi.nets.faceRecognitionNet.isLoaded);

      setStatus("✅ All models loaded successfully.");
      return true;
    } catch (err) {
      console.error("❌ Failed to load models:", err);
      setStatus("❌ Failed to load models.");
      return false;
    }
  };

  return { loadModels, status };
};
