const passwordInput = document.getElementById("password");
const strengthIndicator = document.getElementById("password-strength");

function evalStrength(password) {
  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&]/.test(password)) score++;

  if (score <= 2) {
    return { label: "too weak", className: "weak" };
  }
  if (score === 3 || score === 4) {
    return { label: "medium", className: "medium" };
  }
  return { label: "strong", className: "strong" };
}

if (passwordInput && strengthIndicator) {
  passwordInput.addEventListener("input", () => {
    const strength = evalStrength(passwordInput.value);
    strengthIndicator.textContent = `Strength: ${strength.label}`;
    strengthIndicator.className = `password-strength ${strength.className}`;
  });
}
