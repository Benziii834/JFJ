import { useEffect, useState } from "react";

const HEALTH_URL = "https://jfj-s529.onrender.com/actuator/health";

function WakeBanner() {
  const [state, setState] = useState("ok"); // ok | waking | failed

  useEffect(() => {
    let cancelled = false;
    let done = false;
    let timer = null;
    const startedAt = Date.now();

    // only show the banner if the server is slow (no flash when it's already awake)
    const showTimer = setTimeout(() => {
      if (!cancelled && !done) setState("waking");
    }, 2500);

    async function ping() {
      try {
        // no-cors: we only care that the server answered, not what it said
        await fetch(HEALTH_URL, { mode: "no-cors", cache: "no-store" });
        done = true;
        clearTimeout(showTimer);
        if (!cancelled) setState("ok");
      } catch {
        if (cancelled) return;
        if (Date.now() - startedAt > 120000) {
          done = true;
          setState("failed");
          return;
        }
        timer = setTimeout(ping, 4000);
      }
    }
    ping();

    return () => {
      cancelled = true;
      clearTimeout(showTimer);
      clearTimeout(timer);
    };
  }, []);

  if (state === "ok") return null;

  return (
    <p
      className="banner"
      style={{ margin: 0, textAlign: "center", position: "sticky", top: 0, zIndex: 50 }}
    >
      {state === "waking"
        ? "☕ Waking up the server... the first load can take up to a minute. Hang tight!"
        : "The server is taking longer than usual. Try refreshing in a minute."}
    </p>
  );
}

export default WakeBanner;