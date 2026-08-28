"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Camera as CapCamera } from "@capacitor/camera";

export type FacingMode = "user" | "environment";

function getSupportedMimeType(kind: "video" | "audio"): string {
  if (kind === "video") {
    // Ordem de preferência: H.264 High Profile (padrão Instagram) -> MP4 -> WebM
    if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.640028,mp4a.40.2")) return "video/mp4;codecs=avc1.640028,mp4a.40.2";
    if (MediaRecorder.isTypeSupported("video/mp4;codecs=h264,aac")) return "video/mp4;codecs=h264,aac";
    if (MediaRecorder.isTypeSupported("video/webm;codecs=h264,opus")) return "video/webm;codecs=h264,opus";
    if (MediaRecorder.isTypeSupported("video/mp4")) return "video/mp4";
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) return "video/webm;codecs=vp9,opus";
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) return "video/webm;codecs=vp8,opus";
    if (MediaRecorder.isTypeSupported("video/webm")) return "video/webm";
    return "";
  }
  if (MediaRecorder.isTypeSupported("audio/mp4;codecs=mp4a.40.2")) return "audio/mp4;codecs=mp4a.40.2";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  return "";
}

/** Padrão Instagram Stories: 1080x1920 (9:16 vertical), 30 fps */
function buildVideoConstraints(facingMode: FacingMode): MediaTrackConstraints {
  return {
    facingMode: { ideal: facingMode },
    width: { ideal: 1080, max: 1920 },
    height: { ideal: 1920, max: 1920 },
    frameRate: { ideal: 30, max: 60 },
    aspectRatio: { ideal: 9 / 16 },
  };
}

export function useMediaCapture(
  mode: "photo" | "video" | "audio" | "text" | "gallery",
  initialFacingMode: FacingMode = "user"
) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [facingMode, setFacingMode] = useState<FacingMode>(initialFacingMode);
  const [handsFree, setHandsFree] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false); // preview com frames reais

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isStartingCameraRef = useRef(false);
  const prevConfigRef = useRef({ mode, facingMode });

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    setFlashOn(false);
    setIsReady(false);
    setCameraError(null);
  }, []);

  const attachStreamToVideo = useCallback(async (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");

    try {
      await video.play();
    } catch {
      requestAnimationFrame(() => video.play().catch(() => {}));
    }

    // Marca “pronto” quando o primeiro frame chega com validação de dimensões
    const onReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setIsReady(true);
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("playing", onReady);
        video.removeEventListener("canplay", onReady);
      }
    };

    if (video.readyState >= 2 && video.videoWidth > 0) {
      setIsReady(true);
    } else {
      video.addEventListener("loadeddata", onReady);
      video.addEventListener("playing", onReady);
      video.addEventListener("canplay", onReady);
    }
  }, []);

  /** Aplica foco contínuo + exposição (quando o device suporta) */
  const applyAdvancedConstraints = useCallback(async (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    const caps = track.getCapabilities?.() as any;
    if (!caps) return;

    const advanced: any = {};

    if (caps.focusMode?.includes?.("continuous")) {
      advanced.focusMode = "continuous";
    }
    if (caps.exposureMode?.includes?.("continuous")) {
      advanced.exposureMode = "continuous";
    }
    if (caps.whiteBalanceMode?.includes?.("continuous")) {
      advanced.whiteBalanceMode = "continuous";
    }

    if (Object.keys(advanced).length === 0) return;

    try {
      await track.applyConstraints({ advanced: [advanced] });
    } catch (e) {
      console.warn("[useMediaCapture] advanced constraints not applied:", e);
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (isStartingCameraRef.current) return;

    if (
      streamRef.current &&
      prevConfigRef.current.mode === mode &&
      prevConfigRef.current.facingMode === facingMode
    ) {
      if (mode === "photo" || mode === "video") {
        await attachStreamToVideo(streamRef.current);
      }
      return;
    }

    stopCamera();
    isStartingCameraRef.current = true;
    prevConfigRef.current = { mode, facingMode };
    setCameraError(null);
    setIsReady(false);

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        const insecure =
          typeof window !== "undefined" && !window.isSecureContext;
        throw new Error(
          insecure
            ? "Câmera só funciona em HTTPS ou localhost."
            : "Este dispositivo não expõe mediaDevices."
        );
      }

      if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
        try {
          const status = await CapCamera.requestPermissions();
          if (status.camera === "denied") {
            throw new Error("Permissão de câmera negada nas configurações.");
          }
        } catch (e: any) {
          console.warn("[useMediaCapture] CapCamera permission:", e?.message);
        }
      }

      const needsVideo = mode === "photo" || mode === "video";
      const needsAudio = mode === "video" || mode === "audio";

      if (!needsVideo && !needsAudio) {
        isStartingCameraRef.current = false;
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: needsVideo ? buildVideoConstraints(facingMode) : false,
        audio: needsAudio
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: { ideal: 44100 },
              channelCount: { ideal: 2 },
            }
          : false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr: any) {
        // Fallback Instagram-style: solta resolução/aspect, mantém facing + fps
        console.warn("[useMediaCapture] fallback constraints:", firstErr?.name);
        stream = await navigator.mediaDevices.getUserMedia({
          video: needsVideo
            ? {
                facingMode: { ideal: facingMode },
                frameRate: { ideal: 30 },
              }
            : false,
          audio: needsAudio,
        });
      }

      streamRef.current = stream;

      if (needsVideo) {
        await attachStreamToVideo(stream);
        await applyAdvancedConstraints(stream);
      }
    } catch (err: any) {
      console.error("[useMediaCapture] Camera Error:", err);
      const msg =
        err?.name === "NotAllowedError"
          ? "Permissão de câmera/microfone negada."
          : err?.name === "NotFoundError"
          ? "Nenhuma câmera encontrada."
          : err?.name === "OverconstrainedError"
          ? "Câmera não suporta esta configuração. Tente a outra."
          : err?.message || "Falha ao abrir a câmera.";
      setCameraError(msg);
      toast.error(msg);
    } finally {
      isStartingCameraRef.current = false;
    }
  }, [mode, facingMode, stopCamera, attachStreamToVideo, applyAdvancedConstraints]);

  // Liga stream quando o <video> monta depois
  useEffect(() => {
    if (
      streamRef.current &&
      videoRef.current &&
      (mode === "photo" || mode === "video")
    ) {
      attachStreamToVideo(streamRef.current);
    }
  }, [mode, attachStreamToVideo]);

  // Flash / torch
  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;

    const caps = track.getCapabilities?.() as any;
    if (!caps?.torch) {
      toast.info("Flash não disponível nesta câmera.");
      return;
    }

    const next = !flashOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] } as any);
      setFlashOn(next);
    } catch {
      toast.error("Não foi possível alternar o flash.");
    }
  }, [flashOn]);

  // Mic mute
  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !micMuted;
    });
  }, [micMuted]);

  useEffect(() => {
    const onDeviceChange = () => {
      if (streamRef.current) startCamera();
    };
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
    };
  }, [startCamera]);

  useEffect(() => {
    if (
      streamRef.current &&
      (prevConfigRef.current.facingMode !== facingMode ||
        prevConfigRef.current.mode !== mode)
    ) {
      startCamera();
    }
  }, [facingMode, mode, startCamera]);

  const toggleFacingMode = useCallback(() => {
    setFacingMode((p) => (p === "user" ? "environment" : "user"));
    setFlashOn(false); // flash só faz sentido na traseira
  }, []);

  /** Foto estilo Instagram: full res da track, JPEG 0.92, flip só na front */
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      return Promise.resolve(null);
    }

    const MAX = 1920;
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > MAX || h > MAX) {
      const ratio = Math.min(MAX / w, MAX / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return Promise.resolve(null);

    if (facingMode === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
    });
  }, [facingMode]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      toast.error("Câmera/microfone não está ativo.");
      return;
    }
    if (!isReady && (mode === "photo" || mode === "video")) {
      toast.error("Aguarde a câmera ficar pronta.");
      return;
    }

    chunksRef.current = [];
    const mimeType = getSupportedMimeType(mode === "audio" ? "audio" : "video");

    const options: MediaRecorderOptions = {};
    if (mimeType) options.mimeType = mimeType;

    // Bitrate no patamar Instagram Stories (3.5 Mbps vídeo alvo / 128 kbps áudio)
    if (mode !== "audio") {
      options.videoBitsPerSecond = 3_500_000;
      options.audioBitsPerSecond = 128_000;
    } else {
      options.audioBitsPerSecond = 128_000;
    }

    try {
      recorderRef.current = new MediaRecorder(streamRef.current, options);
    } catch {
      // Fallback 1: tenta sem mimeType mas com bitrates
      try {
        recorderRef.current = new MediaRecorder(streamRef.current, {
          videoBitsPerSecond: options.videoBitsPerSecond,
          audioBitsPerSecond: options.audioBitsPerSecond,
        });
      } catch {
        // Fallback 2: MediaRecorder padrão do browser/device
        recorderRef.current = new MediaRecorder(streamRef.current);
      }
    }

    recorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorderRef.current.start(250); // chunks pequenos = menos perda se crashar
    setRecording(true);
    setSeconds(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }, [mode, isReady]);

  const stopRecording = useCallback((shouldStopCamera: boolean = true) => {
    return new Promise<Blob | null>((resolve) => {
      if (!recorderRef.current || recorderRef.current.state === "inactive") {
        resolve(null);
        return;
      }
      setIsProcessingMedia(true);

      recorderRef.current.onstop = () => {
        const finalMime =
          recorderRef.current?.mimeType ||
          getSupportedMimeType(mode === "audio" ? "audio" : "video");
        const blob = new Blob(chunksRef.current, { type: finalMime });
        setIsProcessingMedia(false);
        resolve(blob);
        if (shouldStopCamera) {
          setTimeout(() => stopCamera(), 0);
        }
      };

      recorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });
  }, [mode, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return {
    videoRef,
    streamRef,
    recording,
    seconds,
    facingMode,
    cameraError,
    isReady,
    flashOn,
    isProcessingMedia,
    isProcessingPhoto: isProcessingMedia,
    startCamera,
    stopCamera,
    capturePhoto,
    startRecording,
    stopRecording,
    toggleFacingMode,
    toggleFlash,
    handsFree,
    setHandsFree,
    micMuted,
    setMicMuted,
  };
}
