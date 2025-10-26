import React from "react";

const Spinner = ({ size = 24, color = "text-blue-600" }) => {
  return (
    <div
      className={`animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 ${color}`}
      style={{
        width: size,
        height: size,
      }}
    />
  );
};

export { Spinner };
