let chatBox = document.getElementById("chat-box");

// 🚀 INIT
window.addEventListener("load", () => {

  let saved = localStorage.getItem("chatHistory");
  if (saved) {
    chatBox.innerHTML = saved;
  }

  let theme = localStorage.getItem("theme");
  if (theme === "light") {
    document.body.classList.add("light");
  }

  chatBox.scrollTop = chatBox.scrollHeight;
});


// 📩 SEND MESSAGE (FINAL STREAM FIX)
function sendMessage() {
  let input = document.getElementById("user-input");
  let text = input.value.trim();

  if (text === "") return;

  appendMessage("user", text);
  input.value = "";

  let botDiv = document.createElement("div");
  botDiv.classList.add("message", "bot");
  chatBox.appendChild(botDiv);

  let cursor = document.createElement("span");
  cursor.classList.add("cursor");
  cursor.innerHTML = "|";
  botDiv.appendChild(cursor);

  chatBox.scrollTop = chatBox.scrollHeight;

  fetch("http://127.0.0.1:5000/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: text })
  }).then(response => {

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = ""; // 🔥 FIX: prevents broken JSON issues

    function readStream() {
      reader.read().then(({ done, value }) => {

        if (done) {
          cursor.remove();
          saveChat();
          return;
        }

        buffer += decoder.decode(value, { stream: true });

        let lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line

        lines.forEach(line => {
          if (line.startsWith("data: ")) {
            let data = line.replace("data: ", "");

            if (data !== "[DONE]") {
              try {
                let parsed = JSON.parse(data);

                if (parsed.token) {

                  cursor.remove();

                  botDiv.innerHTML += parsed.token;

                  botDiv.appendChild(cursor);

                  chatBox.scrollTop = chatBox.scrollHeight;
                }

              } catch (e) {
                // ignore partial JSON chunks safely
              }
            }
          }
        });

        readStream();
      });
    }

    readStream();

  }).catch(err => {
    botDiv.innerHTML = "⚠️ AI not responding. Try again.";
    console.log(err);
  });
}


// 💬 USER MESSAGE
function appendMessage(sender, text) {
  let div = document.createElement("div");
  div.classList.add("message", sender);
  div.innerText = text;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;

  saveChat();
}


// 💾 SAVE CHAT
function saveChat() {
  let clean = chatBox.cloneNode(true);

  let cursor = clean.querySelector(".cursor");
  if (cursor) cursor.remove();

  localStorage.setItem("chatHistory", clean.innerHTML);
}


// 🎤 VOICE INPUT
function startVoice() {
  let recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";

  recognition.start();

  recognition.onresult = function (event) {
    document.getElementById("user-input").value =
      event.results[0][0].transcript;
  };
}


// 🌗 THEME TOGGLE
function toggleTheme() {
  document.body.classList.toggle("light");

  let isLight = document.body.classList.contains("light");
  localStorage.setItem("theme", isLight ? "light" : "dark");
}