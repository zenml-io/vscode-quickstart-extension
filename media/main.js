// @ts-check
// This script will be run within the webview itself

// It cannot access the main VS Code APIs directly.
(function () {
  //@ts-ignore
  const vscode = acquireVsCodeApi();

  document.querySelectorAll(".section").forEach((element) => {
    element.addEventListener("click", (e) => {
      //@ts-ignore
      const id = parseInt(e.target?.dataset.id, 10);
      handleOpenSection(id);
    });
  });

  // document
  //   .querySelector(".next-section")
  //   ?.addEventListener("click", (element) => {
  //     //@ts-ignore for dataset
  //     const id = parseInt(element.target?.dataset.id, 10);
  //     handleOpenSection(id);
  //   });

  // document.querySelector(".next-step")?.addEventListener("click", (element) => {
  //   //@ts-ignore for dataset
  //   handleNextStep();
  // });

  document
    .querySelector(".reset-section")
    ?.addEventListener("click", (element) => {
      //@ts-ignore for dataset
      const id = parseInt(element.target?.dataset.id, 10);
      handleReset();
    });

  document.querySelector(".reset-code")?.addEventListener("click", () => {
    handleResetCode();
  });

  document
    .getElementById("zenml-server-connect")
    ?.addEventListener("click", () => {
      handleServerConnect();
    });

  document.getElementById("next")?.addEventListener("click", () => {
    handleNext();
  });

  document.getElementById("previous")?.addEventListener("click", () => {
    handlePrevious();
  });

  document.querySelectorAll(".run-code").forEach((element) => {
    element.addEventListener("click", () => {
      handleRunCode();
    });
  });

  const progressElement = document.querySelector("#progress");
  if (progressElement) {
    //@ts-ignore
    const start = parseInt(progressElement.dataset.current, 10);
    const end = parseInt(progressElement.dataset.end, 10);
    if (start === 1) {
      progressElement.style.width = `${start / end}%`;
    } else {
      progressElement.style.width = `${(start / end) * 100}%`;
    }
  }
  // handlers
  function handleServerConnect() {
    //@ts-ignore
    const url = document.getElementById("zenml-server-connect-input").value;
    vscode.postMessage({ type: "serverConnect", url });
  }

  function handleNext() {
    vscode.postMessage({ type: "next" });
  }

  function handlePrevious() {
    vscode.postMessage({ type: "previous" });
  }

  function handleRunCode() {
    vscode.postMessage({ type: "runCodeFile" });
  }

  function handleResetCode() {
    vscode.postMessage({ type: "resetCodeFile" });
  }

  function handleOpenSection(id) {
    vscode.postMessage({ type: "openSection", id });
  }

  function handleReset() {
    vscode.postMessage({ type: "resetSection" });
  }

  function handleNextStep() {
    vscode.postMessage({ type: "nextStep" });
  }
})();
