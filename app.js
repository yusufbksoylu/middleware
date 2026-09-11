require("dotenv").config();
const WebSocket = require("ws");
const { handleClientTool } = require("./tools.js");

const AGENT_ID = process.env.ELEVENLABS_AGENT_ID;
const API_KEY = process.env.ELEVENLABS_API_KEY;

async function main() {
  try {
    console.log("Bank Middleware başlatılıyor...");

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${AGENT_ID}`,
      {
        headers: {
          "xi-api-key": API_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `Signed URL alınamadı: ${response.status} ${await response.text()}`
      );
    }

    const data = await response.json();
    const ws = new WebSocket(data.signed_url);

    ws.on("open", () => {
      console.log("ElevenLabs WebSocket bağlantısı kuruldu.");
    });

    ws.on("message", async (raw) => {
      const event = JSON.parse(raw.toString());

      if (event.type === "ping") {
        ws.send(
          JSON.stringify({
            type: "pong",
            event_id: event.ping_event.event_id
          })
        );
        return;
      }

      if (event.type === "conversation_initiation_metadata") {
        const metadata =
          event.conversation_initiation_metadata_event;

        console.log("Conversation ID:", metadata.conversation_id);
        console.log(
          "Giriş ses formatı:",
          metadata.user_input_audio_format
        );
        console.log(
          "Çıkış ses formatı:",
          metadata.agent_output_audio_format
        );
        return;
      }

      if (event.type === "client_tool_call") {
        const tool = event.client_tool_call;

        console.log("Client Tool çağrıldı:", tool.tool_name);

        const result = await handleClientTool(
          tool.tool_name,
          tool.parameters || {}
        );

        ws.send(
          JSON.stringify({
            type: "client_tool_result",
            tool_call_id: tool.tool_call_id,
            result: JSON.stringify(result),
            is_error: result.success === false
          })
        );

        console.log("Tool sonucu gönderildi:", result);
        return;
      }

      if (event.type === "user_transcript") {
        console.log(
          "Kullanıcı:",
          event.user_transcription_event.user_transcript
        );
        return;
      }

      if (event.type === "agent_response") {
        console.log(
          "Agent:",
          event.agent_response_event.agent_response
        );
        return;
      }

      if (event.type === "audio") {
        const audioBase64 =
          event.audio_event.audio_base_64;

        console.log(
          "ElevenLabs'ten ses geldi:",
          audioBase64.length,
          "karakter"
        );
        return;
      }

      if (event.type === "interruption") {
        console.log("Agent yanıtı kesildi.");
        return;
      }
    });

    ws.on("error", (error) => {
      console.error(
        "ElevenLabs WebSocket hatası:",
        error.message
      );
    });

    ws.on("close", (code, reason) => {
      console.log(
        "ElevenLabs bağlantısı kapandı:",
        code,
        reason.toString()
      );
    });

  } catch (error) {
    console.error("Başlatma hatası:");
    console.error(error);
  }
}

main();