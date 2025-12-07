const htmlCode = document.getElementById('html-code');
const cssCode = document.getElementById('css-code');
const preview = document.getElementById('preview');
const voiceBtn = document.getElementById('voice');
const stopBtn = document.getElementById('stop-voice');
const status = document.getElementById('status');
const runBtn = document.getElementById('run');

htmlCode.value = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Пример</title>
</head>
<body>
  <h1>Добро пожаловать!</h1>
  <p>Используйте голосовую команду для редактирования.</p>
</body>
</html>`;

cssCode.value = `body {
  font-family: Arial, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  line-height: 1.6;
}

h1 {
  color: #2563eb;
}`;

function updatePreview() {
  const html = htmlCode.value || "<!-- пустой html -->";
  const css = `<style>${cssCode.value || ""}</style>`;
  const doc = preview.contentDocument || preview.contentWindow.document;
  doc.open();
  doc.write(html + css);
  doc.close();
}

updatePreview();
runBtn.addEventListener('click', updatePreview);

let recognition;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'ru-RU';
  recognition.interimResults = false;

  recognition.onstart = () => {
    status.textContent = "🎙️ Слушаю...";
    voiceBtn.disabled = true;
    stopBtn.disabled = false;
  };

  recognition.onend = () => {
    voiceBtn.disabled = false;
    stopBtn.disabled = true;
  };

  recognition.onresult = async e => {
    const text = e.results[0][0].transcript;
    status.textContent = "🧠 Отправляем запрос в DeepSeek...";
    voiceBtn.disabled = true;
    stopBtn.disabled = true;

    try {
      const res = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          html: htmlCode.value,
          css: cssCode.value
        })
      });
      const data = await res.json();

      if (res.ok && !data.error) {
        htmlCode.value = data.html || htmlCode.value;
        cssCode.value = data.css || cssCode.value;
        updatePreview();
        status.textContent = "✅ Обновлено!";
      } else {
        status.textContent = "⚠️ Ошибка: " + (data.error || res.statusText);
      }
    } catch (err) {
      status.textContent = "Ошибка сети 😢";
      console.error(err);
    } finally {
      voiceBtn.disabled = false;
      stopBtn.disabled = true;
      voiceBtn.innerHTML = '<i class="fas fa-microphone"></i> Начать запись';
    }
  };

  recognition.onerror = (err) => {
    console.error(err);
    status.textContent = "Ошибка распознавания";
    voiceBtn.disabled = false;
    stopBtn.disabled = true;
  };

  voiceBtn.addEventListener('click', () => {
    recognition.start();
  });

  stopBtn.addEventListener('click', () => {
    recognition.stop();
    status.textContent = "⏹️ Запись остановлена";
  });

  stopBtn.disabled = true;
} else {
  status.textContent = "Браузер не поддерживает Web Speech API";
  voiceBtn.disabled = true;
  stopBtn.disabled = true;
}
