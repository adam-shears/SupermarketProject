const passwordInput = document.getElementById("password");
const strengthIndicator = document.getElementById("password-strength");

const requirements = [
  { text: "One uppercase letter", regex: /[A-Z]/ },
  { text: "One lowercase letter", regex: /[a-z]/ },
  { text: "One number", regex: /\d/ },
  { text: "One special character (@$!%*?&)", regex: /[@$!%*?&]/ },
];

function listRequirements(password = "") {
  strengthIndicator.innerHTML = `
  <span>Password must contain at least one of the following:</span>
  <ul class="password-requirements">
    ${requirements
      .map((requirement) => {
        const checked = password.match(requirement.regex) ? "checked" : "unchecked";
        return `<li class="${checked}">${requirement.text}</li>`;
      })
      .join("")}
  </ul>`;
}

if (passwordInput && strengthIndicator) {
  listRequirements();
  passwordInput.addEventListener("input", () => {
    listRequirements(passwordInput.value);
  });
}
