let faceapi = null;
let isInitialized = false;

// Only import face-api.js if the code is running in a browser
if (typeof window !== 'undefined') {
    import('face-api.js')
        .then(module => {
            faceapi = module;
        })
        .catch(err => {
            console.error('Failed to import face-api.js:', err);
        });
}

export const initializeFaceApi = async () => {
    if (isInitialized) {
        return true;
    }

    // Wait until faceapi is loaded
    while (!faceapi) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
        const MODEL_URL = '/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        
        await faceapi.tf.setBackend('webgl'); // Set the backend
        await faceapi.tf.ready();
        
        isInitialized = true;
        console.log('Face-API models loaded and backend set.');
        return true;
    } catch (error) {
        console.error('Failed to initialize Face-API models:', error);
        isInitialized = false;
        return false;
    }
};

export const getFaceApi = () => {
    if (!faceapi) {
        throw new Error("Face-API is not initialized. Call initializeFaceApi first.");
    }
    return faceapi;
};

// Export an object with the functions
export default { initializeFaceApi, getFaceApi };