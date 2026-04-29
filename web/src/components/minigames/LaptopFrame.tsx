import React from "react";
import { motion } from "framer-motion";
import "./LaptopFrame.css";

interface LaptopFrameProps {
  children: React.ReactNode;
}

const LaptopFrame: React.FC<LaptopFrameProps> = ({ children }) => {
  return (
    <div className="laptop-frame-wrapper">
      <motion.div
        className="laptop-frame-container"
        initial={{ opacity: 0, scale: 0.9, rotateX: 20, y: 50 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, rotateX: 10, y: -20 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
      >
        <img
          src="assets/laptop-frame.svg"
          alt="Laptop Frame"
          className="laptop-frame-img"
          draggable={false}
        />
        <div className="screen-content-mount">{children}</div>
      </motion.div>
    </div>
  );
};

export default LaptopFrame;
