const form = document.getElementById("registerForm");
const errorBox = document.getElementById("error");

function showError(message) {
  errorBox.textContent = message;
}

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

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;
  const dob = document.getElementById("dob").value;

  if (name === "") return showError("Please enter your name");
  if (!email.includes("@")) return showError("Please enter a valid email");
  if (!/^[0-9]{10}$/.test(phone)) return showError("Phone must be exactly 10 digits");
  if (password.length < 6) return showError("Password must be at least 6 characters");
  if (dob === "") return showError("Please pick your date of birth");
  if (getAge(dob) < 18) return showError("You must be 18 or older to join JFJ");

  showError("");
  alert("Registered! ✅ (fake for now, the real one comes with the backend)");
});