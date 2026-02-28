import React from "react";
import { useNMNContext } from "./NMNContext";

const SectionalTest = () => {
  const { setSideBar, setSideBarContent } = useNMNContext();

  // Example: Open sidebar with content
  const handleOpenSidebar = () => {
    setSideBarContent(
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Sectional Test Info</h2>
        <p>Your sectional test content here...</p>
      </div>,
    );
    setSideBar(true);
  };

  return (
    <div className="w-full h-full flex flex-col justify-start items-start p-6">
      <h1 className="text-3xl font-bold text-black mb-4">Coming soon...</h1>
      <button onClick={handleOpenSidebar}></button>
    </div>
  );
};

export default SectionalTest;
