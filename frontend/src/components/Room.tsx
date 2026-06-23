import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";

const BACKEND_URL = "http://localhost:3000"; // Update with your actual server port/URL

const Room = () => {
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name");

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState("Initializing media devices...");

  // Shared utility function to initialize the RTCPeerConnection object
  const createPeerConnection = (roomId: string | number, socket: Socket) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }], // Free public Google STUN server
    });

    // Inject our camera/microphone tracks into the WebRTC stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Catch the stranger's incoming streams and bind them to the video component
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        setStatus("Connected!");
      }
    };

    // Gather local ICE Candidates and broadcast them via signaling channel
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          roomId: roomId.toString(),
          candidate: event.candidate,
        });
      }
    };

    return pc;
  };

  useEffect(() => {
    if (!name) return;

    // 1. Initialize Socket Connection
    const socket = io(BACKEND_URL);
    socketRef.current = socket;

    // 2. Request Camera and Microphone Permissions
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setStatus("Waiting for a match...");

        // Notify backend to register user and place them in the matchmaking queue
        socket.emit("join", { name });
      })
      .catch((err) => {
        console.error("Media access denied:", err);
        setStatus("Camera/Microphone access required.");
      });

    // 3. WebRTC Event Handlers matching your backend events

    // Triggered on User 1 (The Offer Creator) when paired by RoomManager
    socket.on("send-offer", async ({ roomId }: { roomId: number | string }) => {
      setStatus("Connecting to stranger...");
      const pc = createPeerConnection(roomId, socket);
      pcRef.current = pc;

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Send SDP offer to backend RoomManager
        socket.emit("offer", { roomId: roomId.toString(), sdp: offer.sdp });
      } catch (error) {
        console.error("Failed to create RTC offer:", error);
      }
    });

    // Triggered on User 2 when receiving User 1's offer from RoomManager
    socket.on(
      "offer",
      async ({ sdp, roomId }: { sdp: string; roomId: string }) => {
        // NOTE: Accommodates your current RoomManager.ts fallback using 'offer' for answers too
        if (!pcRef.current) {
          // We are User 2 receiving an initial Offer
          setStatus("Connecting to stranger...");
          const pc = createPeerConnection(roomId, socket);
          pcRef.current = pc;

          try {
            await pc.setRemoteDescription(
              new RTCSessionDescription({ type: "offer", sdp }),
            );
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // Send SDP answer back to backend RoomManager
            socket.emit("answer", { roomId, sdp: answer.sdp });
          } catch (error) {
            console.error("Failed to handle remote offer:", error);
          }
        } else {
          // We are User 1 receiving the Answer (emitted as 'offer' event by your current RoomManager)
          try {
            await pcRef.current.setRemoteDescription(
              new RTCSessionDescription({ type: "answer", sdp }),
            );
            setStatus("Connected!");
          } catch (error) {
            console.error("Failed to set remote answer description:", error);
          }
        }
      },
    );

    // Custom event to handle standard answer types once you fix RoomManager's onAnswer typo
    socket.on("answer", async ({ sdp }: { sdp: string }) => {
      try {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription({ type: "answer", sdp }),
          );
          setStatus("Connected!");
        }
      } catch (error) {
        console.error("Failed to set remote answer description:", error);
      }
    });

    // ICE Candidate standard forwarding pipeline
    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        if (pcRef.current && candidate) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        console.error("Error adding remote ICE candidate:", error);
      }
    });

    // Cleanup routines on component unmount (or when user clicks next/leaves)
    return () => {
      socket.disconnect();
      if (pcRef.current) pcRef.current.close();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [name]);

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>Welcome, {name}!</h2>
      <div style={{ margin: "10px 0", fontWeight: "bold", color: "#555" }}>
        Status: {status}
      </div>

      <div
        style={{
          display: "flex",
          gap: "20px",
          justifyContent: "center",
          marginTop: "20px",
        }}
      >
        {/* Local Stream Viewport */}
        <div style={{ textAlign: "center" }}>
          <h3>You</h3>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "400px",
              height: "300px",
              borderRadius: "8px",
              backgroundColor: "#222",
            }}
          />
        </div>

        {/* Remote Stream Viewport */}
        <div style={{ textAlign: "center" }}>
          <h3>Stranger</h3>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: "400px",
              height: "300px",
              borderRadius: "8px",
              backgroundColor: "#222",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Room;
