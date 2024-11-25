const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

// Variables de configuración
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Endpoint para verificación del webhook
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("Webhook verificado exitosamente.");
        return res.status(200).send(challenge);
    }
    console.error("Fallo en la verificación del webhook.");
    return res.sendStatus(403);
});

// Endpoint para recibir mensajes
app.post("/webhook", async (req, res) => {
    if (req.body.object === "page") {
        try {
            for (const entry of req.body.entry) {
                const event = entry.messaging && entry.messaging[0];
                if (event && event.message && event.message.text) {
                    const senderId = event.sender.id;
                    const userMessage = event.message.text;

                    // Procesa el mensaje y responde
                    const gptResponse = await getChatGPTResponse(userMessage);
                    await sendMessage(senderId, gptResponse);
                }
            }
            return res.status(200).send("Evento recibido");
        } catch (error) {
            console.error("Error al procesar el evento:", error);
            return res.sendStatus(500);
        }
    }
    return res.sendStatus(404);
});

// Función para procesar el mensaje con OpenAI ChatGPT
const getChatGPTResponse = async (userMessage) => {
    const apiUrl = "https://api.openai.com/v1/chat/completions";

    try {
        const response = await axios.post(
            apiUrl,
            {
                model: "gpt-4.0-mini",
                messages: [
                    {
                        role: "system",
                        content: `Eres un asistente virtual especializado en la incorporación al Colegio Militar de la Nación. Responde únicamente con información disponible en https://www.colegiomilitar.mil.ar/`,
                    },
                    { role: "user", content: userMessage },
                ],
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
            }
        );
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error al llamar a la API de OpenAI:", error.response?.data || error.message);
        return "Lo siento, no pude procesar tu mensaje. Por favor, intenta nuevamente más tarde.";
    }
};

// Función para enviar mensajes a Messenger
const sendMessage = async (recipientId, messageText) => {
    const requestBody = {
        recipient: { id: recipientId },
        message: { text: messageText },
    };

    try {
        const response = await axios.post(
            `https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
            requestBody
        );
        console.log("Mensaje enviado:", response.data);
    } catch (error) {
        console.error("Error al enviar el mensaje:", error.response?.data || error.message);
    }
};

// Inicia el servidor
app.listen(PORT, () => {
    console.log(`Servidor en ejecución en el puerto ${PORT}`);
});
