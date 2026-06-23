import { Route, Routes } from "react-router-dom";
import "./App.css";
import About from "./About";
import Room from "./components/Room";
import Landing from "./components/Landing";

function App() {
  return (
    <>
      <h1>
        Smile you are on{" "}
        <strong>
          <u>JHUMMEGAL!</u>
        </strong>
      </h1>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/room" element={<Room />} />
        <Route path="*" element={<h1>404 Not Found</h1>} />
      </Routes>
    </>
  );
}

export default App;
