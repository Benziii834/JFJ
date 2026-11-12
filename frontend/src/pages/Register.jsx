import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, errorText } from "../api";

function getAge(dob) {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    dob: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("WORKER");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (form.name.trim() === "") return setError("Please enter your name");
    if (!form.email.includes("@")) return setError("Please enter a valid email");
    if (!/^[6-9][0-9]{9}$/.test(form.phone)) return setError("Phone must be 10 digits and start with 6, 7, 8 or 9");
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) return setError("Password needs 8+ characters with a letter and a number");
    if (form.dob === "") return setError("Please pick your date of birth");
    if (getAge(form.dob) < 18) return setError("You must be 18 or older to join JFJ");
    if (form.addressLine.trim() === "") return setError("Please enter your address");
    if (form.city.trim() === "") return setError("Please enter your city");
    if (form.state.trim() === "") return setError("Please enter your state");
    if (!/^[0-9]{6}$/.test(form.pincode.trim())) return setError("Pincode must be 6 digits");

    setError("");
    setLoading(true);

    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone,
          password: form.password,
          dateOfBirth: form.dob,
          addressLine: form.addressLine.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
        }),
      });
      alert("Account created! ✅ Now log in.");
      navigate("/login", { state: { role } });
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
        <p>Create your account</p>
      </header>

      <form onSubmit={handleSubmit}>
        <label>Join as</label>
        <div className="chips">
          <button
            type="button"
            className={role === "WORKER" ? "chip active" : "chip"}
            onClick={() => setRole("WORKER")}
          >
            Register as Worker
          </button>
          <button
            type="button"
            className={role === "PROVIDER" ? "chip active" : "chip"}
            onClick={() => setRole("PROVIDER")}
          >
            Register as Provider
          </button>
        </div>

        <label>Name</label>
        <input type="text" name="name" value={form.name} onChange={handleChange} />

        <label>Email</label>
        <input type="text" name="email" value={form.email} onChange={handleChange} />

        <label>Phone</label>
        <input type="text" name="phone" value={form.phone} onChange={handleChange} />

        <label>Password (8+ characters, a letter and a number)</label>
        <input type="password" name="password" value={form.password} onChange={handleChange} />

        <label>Date of birth</label>
        <input type="date" name="dob" value={form.dob} onChange={handleChange} />

        <label>Address</label>
        <input type="text" name="addressLine" value={form.addressLine} onChange={handleChange} />

        <label>City</label>
        <input type="text" name="city" value={form.city} onChange={handleChange} />

        <label>State</label>
        <input type="text" name="state" value={form.state} onChange={handleChange} />

        <label>Pincode</label>
        <input type="text" name="pincode" value={form.pincode} onChange={handleChange} />

        <p id="error">{error}</p>
        {loading && <p className="link">Waking up the server, first try can take up to a minute 😴</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : "Register"}
        </button>
      </form>

      <p className="link">
        Already have an account? <Link to="/login">Login</Link>
      </p>
      <p className="link">
        <Link to="/">← Back to jobs</Link>
      </p>
    </>
  );
}

export default Register;