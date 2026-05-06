function setupIssuePopups() {
  const warningButtons = document.querySelectorAll(".warning-button");
  const cancelButtons = document.querySelectorAll(".cancel-issue-button");

  warningButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;
      const popup = document.getElementById(targetId);
      if (popup) {
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
}

function isPopupOpen() {
  return [...document.querySelectorAll(".issue-popup")].some(
    (popup) => !popup.classList.contains("hidden")
  );
}

async function fetchPickerState() {
  const res = await fetch("/api/picker/orders", { cache: "no-store" });
  if (!res.ok) {
    return null;
  }
  return await res.json();
}

async function setupAutoSync() {
  if (window.location.pathname !== "/picker") {
    return;
  }

  let lastState = await fetchPickerState();
  if (!lastState) {
    return;
  }

  setInterval(async () => {
    if (isPopupOpen()) {
      return;
    }

    const nextState = await fetchPickerState();
    if (!nextState) {
      return;
    }

    if (JSON.stringify(nextState) !== JSON.stringify(lastState)) {
      window.location.reload();
      return;
    }

    lastState = nextState;
  }, 10000);
}

setupIssuePopups();
setupAutoSync();
