'use client';
import { useState, useEffect } from 'react';

const images = [
  '/attendance.jpg',
  '/attendance2.jpg',
  '/attendance3.jpg',
  // Add more image paths here
];

const ImageSlider = ({ altText = "Image" }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <img
      src={images[currentImageIndex]}
      alt={altText}
      className="h-24 mb-4 transition-opacity duration-1000 ease-in-out"
    />
  );
};

export default ImageSlider;