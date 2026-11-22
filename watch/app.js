(function () {
  var phoneInput = document.getElementById("phone");
  var messageInput = document.getElementById("message");
  var sendButton = document.getElementById("send");
  var messages = document.getElementById("messages");
  var status = document.getElementById("status");

  try {
    phoneInput.value = localStorage.getItem("phoneHost") || "";
  } catch (e) {}

  function addMessage(text, kind) {
    var item = document.createElement("div");
    item.className = "bubble " + kind;
    item.textContent = text;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  }

  function setBusy(busy) {
    sendButton.disabled = busy;
    sendButton.textContent = busy ? "Жду..." : "Отправить";
    status.textContent = busy ? "Запрос..." : "Готов";
  }

  function send() {
    var host = phoneInput.value.trim().replace(/^https?:\\/\\//, "").replace(/\\/$/, "");
    var message = messageInput.value.trim();
    if (!host) {
      addMessage("Сначала введи IP-адрес телефона в верхнее поле.", "assistant");
      return;
    }
    if (!message) return;

    try { localStorage.setItem("phoneHost", host); } catch (e) {}
    addMessage(message, "user");
    messageInput.value = "";
    setBusy(true);

    fetch("http://" + host + ":8787/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message })
    }).then(function (response) {
      if (!response.ok) throw new Error("Телефон ответил: HTTP " + response.status);
      return response.json();
    }).then(function (data) {
      if (!data || typeof data.reply !== "string") throw new Error("Неверный ответ сервера телефона");
      addMessage(data.reply, "assistant");
      status.textContent = "На связи";
    }).catch(function (error) {
      addMessage("Не удалось связаться с телефоном. Проверь IP, Wi-Fi и запущенный companion. " + error.message, "assistant");
      status.textContent = "Ошибка";
    }).then(function () {
      setBusy(false);
    });
  }

  sendButton.addEventListener("click", send);
  messageInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") send();
  });
})();