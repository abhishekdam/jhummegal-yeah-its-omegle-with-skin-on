import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    navigate(`/room/?name=${name}`, { state: { name } });
  };

  return (
    <>
      <label htmlFor="name">Name:</label>
      <input
        onChange={(e) => setName(e.target.value)}
        type="text"
        id="name"
        placeholder="Enter your name"
      />
      <button disabled={!name} onClick={handleJoin}>
        Join!
      </button>
    </>
  );
};

export default Landing;
