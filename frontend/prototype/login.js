const form = document.getElementById("loginForm");
const errorBox = document.getElementById("error");

function showError(message) {
  errorBox.textContent = message;
}

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const user = document.getElementById("user").value.trim();
  const password = document.getElementById("password").value;

  if (user === "") return showError("Please enter your email or phone");
  if (password === "") return showError("Please enter your password");

  showError("");
  alert("Logged in! ✅ (fake for now, the real check comes with the backend)");
});