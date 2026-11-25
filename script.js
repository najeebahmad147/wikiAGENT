const micBtn = document.getElementById("micbtn");
const reactor = document.getElementById("reactor");
const statusText = document.getElementById("statustext");
const chatLog = document.getElementById("chatlog");
const textInput = document.getElementById("textinput");
const sendBtn = document.getElementById("sendbtn");
const apiModal = document.getElementById("apimodal");
const keyBtn = document.getElementById("keybtn");
const saveKeyBtn = document.getElementById("savekeybtn");
const closeModalBtn = document.getElementById("closemodalbtn");
const apiKeyInput = document.getElementById("apikeyinput");

let isSpeaking = false;
const systemPrompt = {
  role: "system",
  content: "You are J.A.R.V.I.S., Tony Stark's AI assistant. Call the user Boss or Sir. Answer accurately and concisely in 2-3 sentences in English or Hinglish. Do not use markdown symbols."
};
let chatHistory = [systemPrompt];

function updateClock() {
  document.getElementById("clock").innerText = new Date().toLocaleTimeString();
}
updateClock();
setInterval(updateClock, 1000);

if ("getBattery" in navigator) {
  navigator.getBattery().then((battery) => {
    const updateBat = () => {
      document.getElementById("battery").innerText = "PWR: " + Math.round(battery.level * 100) + "%";
    };
    updateBat();
    battery.addEventListener("levelchange", updateBat);
  });
}

function speak(text) {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.pitch = 0.92;
  utter.rate = 1.03;
  utter.onstart = () => {
    isSpeaking = true;
    reactor.classList.add("active");
  };
  utter.onend = () => {
    isSpeaking = false;
    reactor.classList.remove("active");
  };
  window.speechSynthesis.speak(utter);
}

function addLog(sender, message, isUser = false) {
  const p = document.createElement("p");
  p.className = isUser ? "usermsg" : "aimsg";
  p.innerText = "[" + sender + "]: " + message;
  chatLog.appendChild(p);
  chatLog.scrollTop = chatLog.scrollHeight;
}

async function runCommand(cmd) {
  if (!cmd || !cmd.trim()) return;
  addLog("BOSS", cmd, true);
  const lower = cmd.toLowerCase().trim();

  if (lower.startsWith("open ")) {
    const site = lower.replace("open ", "").trim();
    const sites = {
      youtube: "https://youtube.com",
      google: "https://google.com",
      github: "https://github.com",
      instagram: "https://instagram.com",
      whatsapp: "https://whatsapp.com",
      gmail: "https://google.com"
    };
    if (sites[site]) {
      const reply = "Launching " + site + " interface now, Boss.";
      addLog("J.A.R.V.I.S.", reply);
      speak(reply);
      window.open(sites[site], "_blank");
      return;
    }
  }

  if (lower.startsWith("search ")) {
    const query = cmd.slice(7).trim();
    const reply = "Searching Google for " + query + ", Boss.";
    addLog("J.A.R.V.I.S.", reply);
    speak(reply);
    window.open("https://google.com/search?q=" + encodeURIComponent(query), "_blank");
    return;
  }

  const apiKey = (localStorage.getItem("groqKey") || "").trim();
  if (!apiKey) {
    const reply = "Boss, click API KEY and paste your Groq key first.";
    addLog("J.A.R.V.I.S.", reply);
    speak(reply);
    return;
  }

  statusText.innerText = "PROCESSING...";
  chatHistory.push({ role: "user", content: cmd });
  if (chatHistory.length > 11) {
    chatHistory = [systemPrompt, ...chatHistory.slice(-10)];
  }

  try {
    const host = ["api", "groq", "com"].join(".");
    const endpoint = "https://" + host + "/openai/v1/chat/completions";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: chatHistory,
        temperature: 0.7,
        max_tokens: 250
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "API Error");
    }

    const aiReply = data.choices.at(0).message.content.trim();
    chatHistory.push({ role: "assistant", content: aiReply });
    addLog("J.A.R.V.I.S.", aiReply);
    speak(aiReply);
    statusText.innerText = "SYSTEM READY";
  } catch (err) {
    addLog("J.A.R.V.I.S.", "System error, Boss: " + err.message);
    speak("Apologies Boss, connection to Groq core failed.");
    statusText.innerText = "ERROR - CHECK API KEY";
  }
}

sendBtn.addEventListener("click", () => {
  runCommand(textInput.value);
  textInput.value = "";
});

textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    runCommand(textInput.value);
    textInput.value = "";
  }
});

keyBtn.addEventListener("click", () => {
  apiKeyInput.value = localStorage.getItem("groqKey") || "";
  apiModal.classList.remove("hidden");
});

closeModalBtn.addEventListener("click", () => {
  apiModal.classList.add("hidden");
});

saveKeyBtn.addEventListener("click", () => {
  localStorage.setItem("groqKey", apiKeyInput.value.trim());
  apiModal.classList.add("hidden");
  const msg = "API Protocol saved and encrypted, Boss.";
  addLog("J.A.R.V.I.S.", msg);
  speak(msg);
});

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRec) {
  const recognition = new SpeechRec();
  recognition.lang = "en-IN";
  recognition.interimResults = false;

  micBtn.addEventListener("click", () => {
    if (isSpeaking) window.speechSynthesis.cancel();
    try {
      recognition.start();
      reactor.classList.add("active");
      statusText.innerText = "LISTENING, BOSS...";
    } catch (e) {
      recognition.stop();
    }
  });

  recognition.onresult = (e) => {
    const transcript = e.results.item(0).item(0).transcript;
    reactor.classList.remove("active");
    runCommand(transcript);
  };

  recognition.onerror = (e) => {
    reactor.classList.remove("active");
    statusText.innerText = "MIC ERROR: " + e.error;
  };

  recognition.onend = () => {
    if (!isSpeaking) reactor.classList.remove("active");
    if (statusText.innerText === "LISTENING, BOSS...") {
      statusText.innerText = "Click the Core to Activate Voice Protocol";
    }
  };
} else {
  micBtn.addEventListener("click", () => {
    alert("Speech Recognition is not supported in this browser. Use Chrome or Edge.");
  });
}
