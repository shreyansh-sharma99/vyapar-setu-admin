const Loader = ({ className }) => {
  return (
    <>
      <div className={`flex items-center justify-center w-full h-full ${className || ''}`}>
        <div className="loader"></div>
      </div>
      <style>{`
    .loader {
      width: 4em;
      height: 4em;
      position: relative;
      will-change: transform;
    }
  
    .loader:before,
    .loader:after {
      content: "";
      position: absolute;
      border-radius: 50%;
      animation: pulsOut 1.8s ease-in-out infinite;
      pointer-events: none;
    }
  
    .loader:before {
      width: 100%;
      height: 100%;
      box-shadow: inset 0 0 0 1em #3b82f6;
      animation-name: pulsIn;
    }
  
    .loader:after {
      width: calc(100% - 2em);
      height: calc(100% - 2em);
      top: 1em;
      left: 1em;
      background-color: #3b82f6;
    }
  
    @keyframes pulsIn {
      0% {
        box-shadow: inset 0 0 0 1em #3b82f6;
        opacity: 1;
      }
      50%, 100% {
        box-shadow: inset 0 0 0 0 #3b82f6;
        opacity: 0;
      }
    }
  
    @keyframes pulsOut {
      0%, 50% {
        box-shadow: 0 0 0 0 #3b82f6;
        opacity: 0;
      }
      100% {
        box-shadow: 0 0 0 1em #3b82f6;
        opacity: 1;
      }
    }
  `}</style>
    </>
  );
};

export default Loader;
