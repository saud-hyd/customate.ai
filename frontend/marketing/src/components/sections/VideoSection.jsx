// src/components/sections/VideoSection.jsx
import React from 'react';

const VideoSection = () => {
  return (
    <section className="frame2">
      <div className="frame2-container">
        <h2 className="frame2-title">Watch how the Customate client portal works</h2>
        <div className="video-container">
          <iframe
            src="https://www.youtube.com/embed/sW2XR_rTfi0"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </section>
  );
};

export default VideoSection;