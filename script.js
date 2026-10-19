"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("video");
  const cameraPlaceholder = document.getElementById("cameraPlaceholder");
  const toggleCameraButton = document.getElementById("toggleCamera");
  const cameraButtonIcon = document.getElementById("cameraButtonIcon");
  const cameraButtonText = document.getElementById("cameraButtonText");
  const flipButton = document.getElementById("flipCamera");
  const captureButton = document.getElementById("captureButton");
  const cameraBadge = document.getElementById("cameraBadge");
  const liveLabel = document.getElementById("liveLabel");
  const statusMessage = document.getElementById("statusMessage");
  const identificationInput = document.getElementById("identification");
  const filterSelect = document.getElementById("filterSelect");
  const resultImage = document.getElementById("resultImage");
  const resultPlaceholder = document.getElementById("resultPlaceholder");
  const resultIdentification = document.getElementById("resultIdentification");
  const resultDate = document.getElementById("resultDate");
  const resultTime = document.getElementById("resultTime");
  const resultFilter = document.getElementById("resultFilter");
  const downloadButton = document.getElementById("downloadButton");

  // Canvas criado pelo JavaScript para processar a foto.
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  let stream = null;
  let isMirrored = true;
  let lastPhotoUrl = null;
  let starting = false;

  const filterOptions = {
    normal: {
      css: "none",
      label: "Original"
    },
    grayscale: {
      css: "grayscale(100%)",
      label: "Preto e branco"
    },
    sepia: {
      css: "sepia(100%)",
      label: "Sépia"
    },
    contrast: {
      css: "contrast(140%)",
      label: "Alto contraste"
    },
    vintage: {
      css: "sepia(45%) contrast(110%) saturate(80%)",
      label: "Vintage"
    }
  };

  function currentFilter() {
    return filterOptions[filterSelect?.value] || filterOptions.normal;
  }

  function setStatus(message, isError = false) {
    if (!statusMessage) return;

    statusMessage.textContent = message;
    statusMessage.classList.toggle("error", isError);
  }

  function setCameraUI(isOn) {
    if (cameraPlaceholder) {
      cameraPlaceholder.hidden = isOn;
    }

    if (video) {
      video.classList.toggle("visible", isOn);
    }

    if (cameraBadge) {
      cameraBadge.textContent = isOn
        ? "CÂMERA LIGADA"
        : "CÂMERA DESLIGADA";

      cameraBadge.classList.toggle("active", isOn);
    }

    if (liveLabel) {
      liveLabel.textContent = isOn
        ? "CÂMERA AO VIVO"
        : "AGUARDANDO CÂMERA";

      liveLabel.parentElement?.classList.toggle("is-live", isOn);
    }

    if (cameraButtonIcon) {
      cameraButtonIcon.textContent = isOn ? "■" : "▶";
    }

    if (cameraButtonText) {
      cameraButtonText.textContent = isOn
        ? "Desligar câmera"
        : "Ligar câmera";
    }

    if (toggleCameraButton) {
      toggleCameraButton.setAttribute("aria-pressed", String(isOn));
    }

    if (flipButton) {
      flipButton.disabled = !isOn;
    }

    if (captureButton) {
      captureButton.disabled = !isOn;
    }
  }

  function applyPreviewSettings() {
    if (!video) return;

    video.style.filter = currentFilter().css;
    video.style.transform = isMirrored
      ? "scaleX(-1)"
      : "scaleX(1)";

    if (flipButton) {
      const label = flipButton.querySelector("span:last-child");

      if (label) {
        label.textContent = isMirrored
          ? "Desespelhar"
          : "Espelhar";
      }
    }
  }

  async function startCamera() {
    if (starting || stream) return;

    if (!video) {
      setStatus("Não encontrei o elemento de vídeo no HTML.", true);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(
        "Este endereço não permite acessar a câmera. Abra pelo localhost ou HTTPS.",
        true
      );
      return;
    }

    starting = true;

    if (toggleCameraButton) {
      toggleCameraButton.disabled = true;
    }

    setStatus("Solicitando permissão para acessar a câmera...");

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: false
      });

      stream = newStream;

      video.srcObject = stream;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;

      await video.play();

      setCameraUI(true);
      applyPreviewSettings();

      setStatus("Câmera ligada! Pode tirar sua foto.");
    } catch (error) {
      console.error("Erro ao ligar a câmera:", error);

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }

      video.srcObject = null;
      setCameraUI(false);

      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        setStatus(
          "Permissão negada. Permita o acesso à câmera nas configurações do navegador.",
          true
        );
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        setStatus("Nenhuma câmera foi encontrada neste dispositivo.", true);
      } else if (
        error.name === "NotReadableError" ||
        error.name === "TrackStartError"
      ) {
        setStatus(
          "A câmera pode estar sendo usada por outro aplicativo. Feche-o e tente novamente.",
          true
        );
      } else {
        setStatus(
          `Não foi possível ligar a câmera: ${error.message || error}`,
          true
        );
      }
    } finally {
      starting = false;

      if (toggleCameraButton) {
        toggleCameraButton.disabled = false;
      }
    }
  }

  function stopCamera(showMessage = true) {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }

    if (video) {
      video.pause();
      video.srcObject = null;
      video.style.filter = "none";
      video.style.transform = "scaleX(1)";
    }

    setCameraUI(false);
    applyPreviewSettings();

    if (showMessage) {
      setStatus("Câmera desligada.");
    }
  }

  function capturePhoto() {
    if (
      !stream ||
      !video ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      setStatus(
        "Ligue a câmera e espere a imagem aparecer antes de capturar.",
        true
      );
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    const footerHeight = Math.max(90, Math.round(height * 0.13));
    const padding = Math.max(16, Math.round(width * 0.025));
    const identification =
      identificationInput?.value.trim() || "Sem identificação";
    const now = new Date();

    canvas.width = width;
    canvas.height = height + footerHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Aplica o efeito e o espelhamento à imagem.
    ctx.save();
    ctx.filter = currentFilter().css;

    if (isMirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    // Faixa inferior com identificação e data.
    ctx.fillStyle = "rgba(20, 15, 35, 0.94)";
    ctx.fillRect(0, height, width, footerHeight);

    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.max(16, Math.round(width * 0.025))}px Arial`;

    ctx.fillText(
      identification,
      padding,
      height + footerHeight * 0.35,
      width - padding * 2
    );

    ctx.fillStyle = "#d7c8ff";
    ctx.font = `${Math.max(12, Math.round(width * 0.017))}px Arial`;

    ctx.fillText(
      `Data: ${now.toLocaleDateString("pt-BR")} | Hora: ${now.toLocaleTimeString("pt-BR")}`,
      padding,
      height + footerHeight * 0.72,
      width - padding * 2
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setStatus("Não foi possível processar a fotografia.", true);
          return;
        }

        if (lastPhotoUrl) {
          URL.revokeObjectURL(lastPhotoUrl);
        }

        lastPhotoUrl = URL.createObjectURL(blob);

        resultImage.src = lastPhotoUrl;
        resultImage.hidden = false;

        if (resultPlaceholder) {
          resultPlaceholder.hidden = true;
        }

        if (resultIdentification) {
          resultIdentification.textContent = identification;
        }

        if (resultDate) {
          resultDate.textContent = now.toLocaleDateString("pt-BR");
        }

        if (resultTime) {
          resultTime.textContent = now.toLocaleTimeString("pt-BR");
        }

        if (resultFilter) {
          resultFilter.textContent = currentFilter().label;
        }

        downloadButton.href = lastPhotoUrl;
        downloadButton.download = `camera-pfe-${Date.now()}.jpg`;
        downloadButton.classList.remove("disabled");
        downloadButton.setAttribute("aria-disabled", "false");

        setStatus("Foto capturada com sucesso!");
      },
      "image/jpeg",
      0.95
    );
  }

  // Botão principal: liga ou desliga a câmera.
  toggleCameraButton?.addEventListener("click", () => {
    if (stream) {
      stopCamera();
    } else {
      startCamera();
    }
  });

  // Inverter o espelhamento.
  flipButton?.addEventListener("click", () => {
    isMirrored = !isMirrored;
    applyPreviewSettings();

    setStatus(
      isMirrored
        ? "Espelhamento ativado."
        : "Espelhamento desativado."
    );
  });

  // Capturar a fotografia.
  captureButton?.addEventListener("click", capturePhoto);

  // Alterar o filtro.
  filterSelect?.addEventListener("change", () => {
    applyPreviewSettings();
    setStatus(`Efeito aplicado: ${currentFilter().label}.`);
  });

  // Download da foto processada.
  downloadButton?.addEventListener("click", (event) => {
    if (
      !lastPhotoUrl ||
      downloadButton.getAttribute("aria-disabled") === "true"
    ) {
      event.preventDefault();
      setStatus("Capture uma foto antes de baixar.", true);
    }
  });

  // Desligar a câmera ao sair da página.
  window.addEventListener("pagehide", () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (lastPhotoUrl) {
      URL.revokeObjectURL(lastPhotoUrl);
    }
  });

  // Estado inicial da interface.
  setCameraUI(false);
  applyPreviewSettings();

  if (resultPlaceholder) {
    resultPlaceholder.hidden = false;
  }

  if (resultImage) {
    resultImage.hidden = true;
  }

  if (downloadButton) {
    downloadButton.classList.add("disabled");
    downloadButton.setAttribute("aria-disabled", "true");
  }

  setStatus("Clique em Ligar câmera para começar.");
});