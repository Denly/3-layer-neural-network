(() => {
  const toast = document.getElementById("toast");
  const copyBtn = document.getElementById("copy-link");
  const shareBtn = document.getElementById("share-card");
  const qrHost = document.getElementById("qr");

  const cardUrl = window.location.href.split("#")[0];

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toast.classList.remove("show"), 2200);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(cardUrl);
      showToast("已複製名片連結");
    } catch {
      showToast("複製失敗，請手動複製網址");
    }
  }

  async function shareCard() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Chloe · GrowGPT 顧問",
          text: "這是 GrowGPT 顧問 Chloe 的電子名片",
          url: cardUrl,
        });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    copyLink();
  }

  function renderQr() {
    if (!qrHost || typeof QRCode === "undefined") return;
    qrHost.innerHTML = "";
    // QRCode.js attaches to global as QRCode
    // eslint-disable-next-line no-undef
    new QRCode(qrHost, {
      text: cardUrl,
      width: 112,
      height: 112,
      colorDark: "#1a1d21",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M,
    });
  }

  copyBtn?.addEventListener("click", copyLink);
  shareBtn?.addEventListener("click", shareCard);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderQr);
  } else {
    renderQr();
  }
})();
