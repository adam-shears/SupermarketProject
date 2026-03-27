function closeAllIssuePopups() {
  const popups = document.querySelectorAll(".issue-popup");
  popups.forEach((popup) => {
    popup.classList.add("hidden");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const warningButtons = document.querySelectorAll(".warning-button");
  const cancelButtons = document.querySelectorAll(".cancel-issue-button");

  warningButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;
      const popup = document.getElementById(targetId);

      if (!popup) return;

      const isHidden = popup.classList.contains("hidden");

      closeAllIssuePopups();

      if (isHidden) {
        popup.classList.remove("hidden");
      }
    });
  });

  cancelButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const popup = button.closest(".issue-popup");
      if (popup) {
        popup.classList.add("hidden");
      }
    });
  });
});