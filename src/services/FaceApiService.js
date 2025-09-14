// src/services/faceApiService.js
'use client';

import * as faceapi from 'face-api.js';
import * as tf from '@tensorflow/tfjs';

let isInitialized = false;

/**
 * initializeFaceApi(detector = 'tiny')
 * detector: 'tiny' (recommended realtime) or 'ssd'
 */
export const initializeFaceApi = async (detector = 'tiny') => {
  if (typeof window === 'undefined') return false; // ensure client-side
  if (isInitialized) return true;

  try {
    // prefer webgl, fallback to cpu
    try {
      await tf.setBackend('webgl');
    } catch (e) {
      console.warn('WebGL backend not available, falling back to CPU.', e);
      await tf.setBackend('cpu');
    }
    await tf.ready();

    const MODEL_URL = '/models'; // must be public/models/*

    console.log('FaceApiService: loading models from', MODEL_URL);

    if (detector === 'tiny') {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    } else {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    }

    // face landmarks and recognition required in both cases
    await Promise.all([
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    isInitialized = true;
    console.log('✅ FaceApiService: models loaded and TF backend ready.');
    return true;
  } catch (err) {
    console.error('❌ FaceApiService: failed to initialize', err);
    isInitialized = false;
    return false;
  }
};

export const getFaceApi = () => faceapi;

export default {
  initializeFaceApi,
  getFaceApi,
};
