const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// Variables de configuración
const PORT = process.env.PORT || 3000; // Render asignará el puerto automáticamente
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "Vyzo123"; // Token de verificación para Meta
const PAGE_ACCESS_TOKEN = "8f0b04d1cf92f81a605f86921229ed38"; // Token de acceso de página de Meta
const OPENAI_API_KEY = "sk-svcacct-_sNLowu_zUNFlaDHQ7W2fMluIFhV7kXm1AEkQwO_OTbDqu0i4ImbHV9xfQLwzymT3BlbkFJ80jg5mkOCHS4i2ODZiy8aJXuAarXlmcxE8mpzrJ611MOBI33mKT8EKqhXQMrpWAA"; // Clave de API de OpenAI

// Endpoint para verificación del webhook
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("Webhook verificado.");
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Endpoint para recibir mensajes
app.post("/webhook", async (req, res) => {
    const body = req.body;

    if (body.object === "page") {
        for (const entry of body.entry) {
            const event = entry.messaging[0];
            if (event.message && event.message.text) {
                const senderId = event.sender.id;
                const userMessage = event.message.text;

                // Procesa el mensaje con ChatGPT y responde
                const gptResponse = await getChatGPTResponse(userMessage);
                sendMessage(senderId, gptResponse);
            }
        }
        res.status(200).send("Evento recibido");
    } else {
        res.sendStatus(404);
    }
});

// Función para procesar el mensaje con OpenAI ChatGPT
const getChatGPTResponse = async (userMessage) => {
    const apiUrl = "https://api.openai.com/v1/chat/completions";

    try {
        const response = await axios.post(
            apiUrl,
            {
                model: "gpt-4.0-mini", // Puedes cambiarlo según el modelo que uses.
                messages: [{ role: "system", content: "Eres un asistente que responde de manera amigable y profesional a todas las consultas." },
                  { role: "user", content: userMessage }],
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("Error al llamar a la API de OpenAI:", error.response.data);
        return "Lo siento, hubo un problema al procesar tu mensaje. Inténtalo nuevamente.";
    }
};

// Función para enviar mensajes a Messenger
const sendMessage = (recipientId, messageText) => {
    const requestBody = {
        recipient: { id: recipientId },
        message: { text: messageText },
    };

    axios
        .post(
            `https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
            requestBody
        )
        .then(response => console.log("Mensaje enviado:", response.data))
        .catch(error => console.error("Error al enviar el mensaje:", error.response.data));
};

// Inicia el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
