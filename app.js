require("dotenv").config();

const http = require("http");
const WebSocket = require("ws");
const { URL } = require("url");

const { handleClientTool } = require("./tools.js");
const AudioBridge = require("./audioBridge.js");

const AGENT_ID = process.env.ELEVENLABS_AGENT_ID;
const API_KEY = process.env.ELEVENLABS_API_KEY;
const PORT = process.env.PORT || 8080;

const sessions = new Map();

async function getSignedUrl() {
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

  return data.signed_url;
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);

  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body)
  });

  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Geçersiz JSON body"));
      }
    });

    req.on("error", reject);
  });
}



const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(
      req.url,
      `http://${req.headers.host}`
    );

  

    if (
      req.method === "POST" &&
      url.pathname === "/incoming-call-asterisk"
    ) {
      const body = await readJsonBody(req);

      const token =
        url.searchParams.get("token") ||
        "";

      const astUid =
        url.searchParams.get("ast_uid") ||
        body.ast_uid ||
        body.uid;

      const corrid =
        url.searchParams.get("corrid") ||
        body.corrid;

      const caller =
        url.searchParams.get("caller") ||
        body.caller ||
        body.from;

      const did =
        url.searchParams.get("did") ||
        body.did;

      const callId =
        astUid ||
        corrid ||
        `ast-${Date.now()}`;

      sessions.set(callId, {
        callId,
        caller,
        did,
        token,
        createdAt: Date.now()
      });

      const proto =
        req.headers["x-forwarded-proto"] === "https"
          ? "wss"
          : "ws";

      const host =
        req.headers["x-forwarded-host"] ||
        req.headers.host;

      let wsUrl =
        `${proto}://${host}/media-stream/${callId}`;

      if (token) {
        wsUrl +=
          `?token=${encodeURIComponent(token)}`;
      }

      console.log(
        `[INCOMING] callId=${callId} caller=${caller || "-"} did=${did || "-"}`
      );

      sendJson(res, 200, {
        action: "connect_stream",
        call_id: callId,
        ws_url: wsUrl,
        format: "twilio_media_streams",
        codec: "PCMU",
        sample_rate: 8000
      });

      return;
    }

    
    if (
      req.method === "GET" &&
      url.pathname === "/health"
    ) {
      sendJson(res, 200, {
        ok: true,
        service: "bank-middleware"
      });

      return;
    }

    sendJson(res, 404, {
      error: "Not found"
    });

  } catch (error) {
    console.error(
      "HTTP hata:",
      error.message
    );

    sendJson(res, 500, {
      error: "Internal server error"
    });
  }
});



const mediaWss = new WebSocket.Server({
  noServer: true
});

server.on("upgrade", (req, socket, head) => {
  try {
    const url = new URL(
      req.url,
      `http://${req.headers.host}`
    );

    if (
      !url.pathname.startsWith(
        "/media-stream/"
      )
    ) {
      socket.destroy();
      return;
    }

    mediaWss.handleUpgrade(
      req,
      socket,
      head,
      ws => {
        mediaWss.emit(
          "connection",
          ws,
          req,
          url
        );
      }
    );

  } catch (error) {
    console.error(
      "WebSocket upgrade hatası:",
      error.message
    );

    socket.destroy();
  }
});



mediaWss.on(
  "connection",
  (asteriskWs, req, url) => {

    const callId =
      url.pathname.split("/").pop();

    console.log(
      `[${callId}] Asterisk WebSocket bağlandı`
    );

    let elevenWs = null;
    let bridge = null;

    let pendingStreamSid = null;
    const pendingMedia = [];

    

    asteriskWs.on("message", raw => {
      let data;

      try {
        data = JSON.parse(
          raw.toString()
        );
      } catch {
        return;
      }

      const eventType = data.event;

      

      if (eventType === "start") {
        const streamSid =
          data.start?.streamSid;

        if (!streamSid) {
          return;
        }

        console.log(
          `[${callId}] start streamSid=${streamSid}`
        );

        pendingStreamSid =
          streamSid;

        if (bridge) {
          bridge.setStreamSid(
            streamSid
          );
        }

        return;
      }

      

      if (eventType === "media") {
        const payload =
          data.media?.payload;

        if (!payload) {
          return;
        }

        if (
          bridge &&
          elevenWs &&
          elevenWs.readyState ===
            WebSocket.OPEN
        ) {
          bridge.handleAsteriskAudio(
            payload
          );
        } else {
          
          if (
            pendingMedia.length < 500
          ) {
            pendingMedia.push(
              payload
            );
          }
        }

        return;
      }

     if (eventType === "stop") {
        console.log(
          `[${callId}] stop`
        );

        if (bridge) {
          bridge.stop();
        }

        if (
          elevenWs &&
          elevenWs.readyState ===
            WebSocket.OPEN
        ) {
          elevenWs.close();
        }

        return;
      }
    });

    

    asteriskWs.on("close", () => {
      console.log(
        `[${callId}] Asterisk bağlantısı kapandı`
      );

      if (bridge) {
        bridge.stop();
      }

      if (
        elevenWs &&
        (
          elevenWs.readyState ===
            WebSocket.OPEN ||
          elevenWs.readyState ===
            WebSocket.CONNECTING
        )
      ) {
        elevenWs.close();
      }

      sessions.delete(callId);
    });

    asteriskWs.on(
      "error",
      error => {
        console.error(
          `[${callId}] Asterisk WS hata:`,
          error.message
        );
      }
    );
    

    async function connectElevenLabs() {
      try {
        const signedUrl =
          await getSignedUrl();

        elevenWs =
          new WebSocket(signedUrl);


        bridge =
          new AudioBridge(
            asteriskWs,
            elevenWs,
            callId
          );

        bridge.start();

        

        if (pendingStreamSid) {
          bridge.setStreamSid(
            pendingStreamSid
          );
        }

        

        elevenWs.on("open", () => {
          console.log(
            `[${callId}] ElevenLabs bağlandı`
          );

          /*
           * Bağlantı kurulmadan gelen Asterisk audio
           * şimdi ElevenLabs'e aktarılır.
           */

          while (
            pendingMedia.length > 0
          ) {
            const payload =
              pendingMedia.shift();

            bridge.handleAsteriskAudio(
              payload
            );
          }
        });

      

        elevenWs.on(
          "message",
          async raw => {
            let event;

            try {
              event = JSON.parse(
                raw.toString()
              );
            } catch {
              return;
            }

         

            if (event.type === "ping") {
              elevenWs.send(
                JSON.stringify({
                  type: "pong",
                  event_id:
                    event
                      .ping_event
                      .event_id
                })
              );

              return;
            }

           
            if (
              event.type ===
              "conversation_initiation_metadata"
            ) {
              const metadata =
                event
                  .conversation_initiation_metadata_event;

              console.log(
                `[${callId}] Conversation ID:`,
                metadata.conversation_id
              );

              console.log(
                `[${callId}] Input format:`,
                metadata
                  .user_input_audio_format
              );

              console.log(
                `[${callId}] Output format:`,
                metadata
                  .agent_output_audio_format
              );

              return;
            }

           

            if (
              event.type === "audio" &&
              bridge
            ) {
              const audioBase64 =
                event
                  .audio_event
                  .audio_base_64;

              if (audioBase64) {
                bridge
                  .handleElevenLabsAudio(
                    audioBase64
                  );
              }

              return;
            }

            if (
              event.type ===
              "client_tool_call"
            ) {
              const tool =
                event.client_tool_call;

              console.log(
                `[${callId}] Client Tool:`,
                tool.tool_name
              );

              const result =
                await handleClientTool(
                  tool.tool_name,
                  tool.parameters || {}
                );

              elevenWs.send(
                JSON.stringify({
                  type:
                    "client_tool_result",

                  tool_call_id:
                    tool.tool_call_id,

                  result:
                    JSON.stringify(
                      result
                    ),

                  is_error:
                    result.success ===
                    false
                })
              );

              return;
            }

            

            if (
              event.type ===
              "user_transcript"
            ) {
              console.log(
                `[${callId}] Kullanıcı:`,
                event
                  .user_transcription_event
                  .user_transcript
              );

              return;
            }

           

            if (
              event.type ===
              "agent_response"
            ) {
              console.log(
                `[${callId}] Agent:`,
                event
                  .agent_response_event
                  .agent_response
              );

              return;
            }

            
            if (
              event.type ===
              "interruption"
            ) {
              console.log(
                `[${callId}] interruption`
              );

              if (bridge) {
                bridge.interrupt();
              }

              return;
            }
          }
        );

       

        elevenWs.on(
          "error",
          error => {
            console.error(
              `[${callId}] ElevenLabs WS hata:`,
              error.message
            );
          }
        );

       

        elevenWs.on(
          "close",
          (code, reason) => {
            console.log(
              `[${callId}] ElevenLabs kapandı:`,
              code,
              reason.toString()
            );

            if (bridge) {
              bridge.stop();
            }
          }
        );

      } catch (error) {
        console.error(
          `[${callId}] ElevenLabs bağlantı hatası:`,
          error.message
        );

        if (
          asteriskWs.readyState ===
          WebSocket.OPEN
        ) {
          asteriskWs.close();
        }
      }
    }

    connectElevenLabs();
  }
);



server.listen(PORT, () => {
  console.log(
    `Bank Middleware çalışıyor: http://localhost:${PORT}`
  );

  console.log(
    `Incoming endpoint: POST http://localhost:${PORT}/incoming-call-asterisk`
  );

  console.log(
    `Health: http://localhost:${PORT}/health`
  );
});