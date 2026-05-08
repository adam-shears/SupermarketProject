const passwordInput = document.getElementById("password");
const strengthIndicator = document.getElementById("password-strength");

const requirements = [
  { text: "At least one uppercase letter", regex: /[A-Z]/ },
  { text: "At least one lowercase letter", regex: /[a-z]/ },
  { text: "At least one number", regex: /\d/ },
  { text: "At least one special character (@$!%*?&)", regex: /[@$!%*?&]/ },
];

function listRequirements(password = "") {
  strengthIndicator.innerHTML = `
  <span>Password must contain all of the following:</span>
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
