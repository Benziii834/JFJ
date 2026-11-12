import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { errorText } from "../api";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, switchMode } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (email.trim() === "") return setError("Please enter your email");
    if (password === "") return setError("Please enter your password");

    setError("");
    setLoading(true);

    try {
      await login(email.trim().toLowerCase(), password);
      if (location.state && location.state.role === "PROVIDER") {
        await switchMode("PROVIDER");
      }
      navigate("/profile");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header>
        <h1>JFJ</h1>
        <p>Welcome back</p>
      </header>

      <form onSubmit={handleSubmit}>
        <label>Email</label>
        <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <p id="error">{error}</p>
        {loading && <p className="link">Waking up the server, first try can take up to a minute</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : "Login"}
        </button>
      </form>

      <p className="link">
        New here? <Link to="/register">Create an account</Link>
      </p>
      <p className="link">
        <Link to="/">← Back to jobs</Link>
      </p>
    </>
  );
}

export default Login;