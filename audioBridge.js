class AudioBridge {
  constructor(
    asteriskWs,
    elevenLabsWs,
    callId
  ) {
    this.asteriskWs =
      asteriskWs;

    this.elevenLabsWs =
      elevenLabsWs;

    this.callId =
      callId;

    this.streamSid =
      null;

    this.outputQueue =
      [];

    this.outputTimer =
      null;

    

    this.CHUNK_SIZE =
      160;

    this.CHUNK_INTERVAL_MS =
      20;
  }

  
  start() {
    if (this.outputTimer) {
      return;
    }

    this.outputTimer =
      setInterval(
        () => {
          this.sendNextChunk();
        },
        this.CHUNK_INTERVAL_MS
      );
  }

 
  stop() {
    if (this.outputTimer) {
      clearInterval(
        this.outputTimer
      );

      this.outputTimer =
        null;
    }

    this.outputQueue = [];
  }

  

  setStreamSid(streamSid) {
    this.streamSid =
      streamSid;

    console.log(
      `[${this.callId}] Asterisk stream başladı: ${streamSid}`
    );
  }


  handleAsteriskAudio(
    base64Payload
  ) {
    if (!base64Payload) {
      return;
    }

    const ulawBuffer =
      Buffer.from(
        base64Payload,
        "base64"
      );

    const pcm8k =
      this.ulawToPcm16(
        ulawBuffer
      );

    const pcm16k =
      this.resample8kTo16k(
        pcm8k
      );

    if (
      this.elevenLabsWs &&
      this.elevenLabsWs.readyState === 1
    ) {
      this.elevenLabsWs.send(
        JSON.stringify({
          user_audio_chunk:
            pcm16k.toString(
              "base64"
            )
        })
      );
    }
  }

  

  handleElevenLabsAudio(
    base64Audio
  ) {
    if (!base64Audio) {
      return;
    }

    const pcm16k =
      Buffer.from(
        base64Audio,
        "base64"
      );

    const pcm8k =
      this.resample16kTo8k(
        pcm16k
      );

    const ulaw =
      this.pcm16ToUlaw(
        pcm8k
      );

    for (
      let offset = 0;
      offset < ulaw.length;
      offset += this.CHUNK_SIZE
    ) {
      const chunk =
        ulaw.subarray(
          offset,
          offset +
            this.CHUNK_SIZE
        );

      if (chunk.length > 0) {
        this.outputQueue.push(
          chunk
        );
      }
    }
  }


  sendNextChunk() {
    if (!this.streamSid) {
      return;
    }

    if (
      !this.asteriskWs ||
      this.asteriskWs.readyState !== 1
    ) {
      return;
    }

    if (
      this.outputQueue.length === 0
    ) {
      return;
    }

    const chunk =
      this.outputQueue.shift();

    const message = {
      event: "media",

      streamSid:
        this.streamSid,

      media: {
        payload:
          chunk.toString(
            "base64"
          )
      }
    };

    this.asteriskWs.send(
      JSON.stringify(
        message
      )
    );
  }


  interrupt() {
    this.outputQueue = [];

    if (
      this.streamSid &&
      this.asteriskWs &&
      this.asteriskWs.readyState === 1
    ) {
      this.asteriskWs.send(
        JSON.stringify({
          event: "clear",
          streamSid:
            this.streamSid
        })
      );
    }
  }


  ulawToPcm16(
    ulawBuffer
  ) {
    const output =
      Buffer.alloc(
        ulawBuffer.length * 2
      );

    for (
      let i = 0;
      i < ulawBuffer.length;
      i++
    ) {
      const sample =
        this.decodeUlawSample(
          ulawBuffer[i]
        );

      output.writeInt16LE(
        sample,
        i * 2
      );
    }

    return output;
  }

  decodeUlawSample(byte) {
    byte =
      ~byte & 0xff;

    const sign =
      byte & 0x80;

    const exponent =
      (byte >> 4) & 0x07;

    const mantissa =
      byte & 0x0f;

    let sample =
      ((mantissa << 3) + 0x84)
        << exponent;

    sample -= 0x84;

    return sign
      ? -sample
      : sample;
  }



  pcm16ToUlaw(
    pcmBuffer
  ) {
    const sampleCount =
      Math.floor(
        pcmBuffer.length / 2
      );

    const output =
      Buffer.alloc(
        sampleCount
      );

    for (
      let i = 0;
      i < sampleCount;
      i++
    ) {
      const sample =
        pcmBuffer.readInt16LE(
          i * 2
        );

      output[i] =
        this.encodeUlawSample(
          sample
        );
    }

    return output;
  }

  encodeUlawSample(sample) {
    const BIAS =
      0x84;

    const CLIP =
      32635;

    let sign = 0;

    if (sample < 0) {
      sample =
        -sample;

      sign =
        0x80;
    }

    if (sample > CLIP) {
      sample =
        CLIP;
    }

    sample += BIAS;

    let exponent = 7;

    for (
      let mask = 0x4000;
      (sample & mask) === 0 &&
      exponent > 0;
      mask >>= 1
    ) {
      exponent--;
    }

    const mantissa =
      (
        sample >>
        (exponent + 3)
      ) & 0x0f;

    return ~(
      sign |
      (exponent << 4) |
      mantissa
    ) & 0xff;
  }

 

  resample8kTo16k(
    input
  ) {
    const samples =
      Math.floor(
        input.length / 2
      );

    if (samples === 0) {
      return Buffer.alloc(0);
    }

    const output =
      Buffer.alloc(
        samples * 4
      );

    for (
      let i = 0;
      i < samples;
      i++
    ) {
      const current =
        input.readInt16LE(
          i * 2
        );

      const next =
        i + 1 < samples
          ? input.readInt16LE(
              (i + 1) * 2
            )
          : current;

      const interpolated =
        Math.round(
          (current + next) / 2
        );

      output.writeInt16LE(
        current,
        i * 4
      );

      output.writeInt16LE(
        interpolated,
        i * 4 + 2
      );
    }

    return output;
  }

  resample16kTo8k(
    input
  ) {
    const samples =
      Math.floor(
        input.length / 2
      );

    const outputSamples =
      Math.floor(
        samples / 2
      );

    const output =
      Buffer.alloc(
        outputSamples * 2
      );

    for (
      let i = 0;
      i < outputSamples;
      i++
    ) {
      const first =
        input.readInt16LE(
          i * 4
        );

      const second =
        input.readInt16LE(
          i * 4 + 2
        );

      const averaged =
        Math.round(
          (first + second) / 2
        );

      output.writeInt16LE(
        averaged,
        i * 2
      );
    }

    return output;
  }
}

module.exports =
  AudioBridge;