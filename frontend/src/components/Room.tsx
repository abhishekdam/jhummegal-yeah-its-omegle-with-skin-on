import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const Room = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const name = searchParams.get("name");

  useEffect(() => {
    // login for join room
  }, [name]);

  return <>Hi {name} !</>;
};

export default Room;
