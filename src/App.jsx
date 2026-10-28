
import { useEffect, useRef, useState } from "react";
import {
  FaceDetector,
  FilesetResolver
} from "@mediapipe/tasks-vision";
import {
  Heart, Camera, CameraOff, Sparkles,
  Music2, Play, Pause, Volume2
} from "lucide-react";
import "./App.css";

const kataCinta = [
  "Dari jutaan wajah di dunia, wajahmulah yang selalu ingin aku lihat. ❤️",
  "Kalau dunia membuatmu lelah, pulanglah kepadaku. Aku ingin menjadi tempat ternyamanmu. 🌷",
  "Aku tidak membutuhkan kisah cinta yang sempurna. Aku hanya ingin kisah yang selalu ada kamu di dalamnya. 💕",
  "Senyummu adalah alasan sederhana mengapa hariku terasa begitu indah. 🥹",
  "Jika cinta bisa dipindai, namamulah yang selalu ditemukan oleh hatiku. 💖",
  "Aku memilihmu hari ini, besok, dan di setiap hari yang masih diberikan untuk kita. 🌹",
  "Seandainya suatu hari ingatanku memudar, aku berharap hatiku masih bisa mengenalmu. 💗",
  "Aku tidak berjanji semua hari akan indah, tetapi aku ingin menemanimu melewati hari-hari yang sulit. 🌸"
];

const simbol = ["🌸", "🌷", "💗", "💕", "✨", "💖", "🌹"];

export default function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const frameRef = useRef(null);
  const audioRef = useRef(null);
  const fadeRef = useRef(null);
  const lastScanRef = useRef(0);
  const detectedRef = useRef(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [detected, setDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState(0);
  const [nama, setNama] = useState("Sayangku");
  const [musicOn, setMusicOn] = useState(false);
  const [volume, setVolume] = useState(40);
  const [musicError, setMusicError] = useState("");

  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      emoji: simbol[Math.floor(Math.random() * simbol.length)],
      left: Math.random() * 100,
      delay: Math.random() * -15,
      duration: 7 + Math.random() * 10,
      size: 16 + Math.random() * 23
    }))
  );

  // Mengganti pesan romantis otomatis
  useEffect(() => {
    if (!detected) return;

    const interval = setInterval(() => {
      setPesan(p => (p + 1) % kataCinta.length);
    }, 5500);

    return () => clearInterval(interval);
  }, [detected]);

  // Mengikuti perubahan volume
  useEffect(() => {
    if (audioRef.current && !fadeRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Membersihkan resource saat komponen ditutup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameRef.current);
      clearInterval(fadeRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      detectorRef.current?.close();
    };
  }, []);

  // Memutar musik dengan fade-in
  const playMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    clearInterval(fadeRef.current);
    fadeRef.current = null;
    setMusicError("");

    try {
      if (!audio.paused) {
        audio.volume = volume / 100;
        setMusicOn(true);
        return;
      }

      audio.volume = 0;
      await audio.play();
      setMusicOn(true);

      const target = volume / 100;

      fadeRef.current = setInterval(() => {
        const next = Math.min(
          target,
          audio.volume + 0.02
        );

        audio.volume = next;

        if (next >= target) {
          clearInterval(fadeRef.current);
          fadeRef.current = null;
        }
      }, 100);
    } catch (error) {
      console.error("Music error:", error);
      setMusicOn(false);
      setMusicError(
        "Musik gagal diputar. Pastikan romantis.mp3 tersedia dan bisa dibuka."
      );
    }
  };

  // Tombol Play / Pause
  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      clearInterval(fadeRef.current);
      fadeRef.current = null;
      audio.pause();
      setMusicOn(false);
    } else {
      await playMusic();
    }
  };

  // Scanner wajah
  const scanFace = () => {
    const video = videoRef.current;
    const detector = detectorRef.current;

    if (!video || !detector || !streamRef.current) return;

    const now = performance.now();

    if (
      video.readyState >= 2 &&
      now - lastScanRef.current > 180
    ) {
      lastScanRef.current = now;

      try {
        const result = detector.detectForVideo(video, now);
        const found = result.detections.length > 0;

        if (found !== detectedRef.current) {
          detectedRef.current = found;
          setDetected(found);

          if (found) setPesan(0);
        }
      } catch (error) {
        console.error("Scan error:", error);
      }
    }

    frameRef.current = requestAnimationFrame(scanFace);
  };

  // Menyalakan kamera dan musik
  const startCamera = async () => {
    if (loading || cameraOn) return;

    // Musik dipanggil langsung dari klik pengguna
    void playMusic();

    setLoading(true);

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      if (!detectorRef.current) {
        detectorRef.current =
          await FaceDetector.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
            },
            runningMode: "VIDEO",
            minDetectionConfidence: 0.55
          });
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user" }
        });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      await videoRef.current.play();

      setCameraOn(true);
      scanFace();
    } catch (error) {
      console.error(error);
      alert(
        "Kamera gagal dibuka. Izinkan akses kamera dan gunakan HTTPS atau localhost."
      );
    } finally {
      setLoading(false);
    }
  };

  // Mematikan kamera
  const stopCamera = () => {
    cancelAnimationFrame(frameRef.current);

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    detectedRef.current = false;
    setDetected(false);
    setCameraOn(false);
  };

  return (
    <main className="app">
      <audio
        ref={audioRef}
       src={`${import.meta.env.BASE_URL}music/romantis.mp3`}
        preload="auto"
        loop
        onPlay={() => setMusicOn(true)}
        onPause={() => setMusicOn(false)}
        onError={() => {
          setMusicOn(false);
          setMusicError(
            "File musik tidak ditemukan atau formatnya tidak didukung."
          );
        }}
      />

      {/* Bunga dan love berjatuhan */}
      <div className="particles" aria-hidden="true">
        {particles.map(p => (
          <span
            key={p.id}
            className="particle"
            style={{
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              fontSize: `${p.size}px`
            }}
          >
            {p.emoji}
          </span>
        ))}
      </div>

      <section className="love-card">
        <div className="badge">
          <Sparkles size={15} />
          LOVE VISION 3.0
        </div>

        <h1>
          Vision <span>Cinta</span> 💗
        </h1>

        <p className="subtitle">
          Sebuah dunia kecil, tempat wajahmu menjadi
          keajaiban paling indah dalam hidupku.
        </p>

        <div className="name-field">
          <label htmlFor="nama">
            Nama orang tersayang 💕
          </label>
          <input
            id="nama"
            value={nama}
            maxLength={30}
            onChange={e => setNama(e.target.value)}
            placeholder="Masukkan nama pacarmu..."
          />
        </div>

        {/* Webcam */}
        <div className={`camera-box ${detected ? "found" : ""}`}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="video"
          />

          {!cameraOn && (
            <div className="camera-placeholder">
              <Heart size={65} fill="#ff5c9c" />
              <p>Aktifkan kamera untuk menemukan cinta 💕</p>
            </div>
          )}

          {cameraOn && (
            <>
              <div className="scan-line" />
              <div className="corner tl" />
              <div className="corner tr" />
              <div className="corner bl" />
              <div className="corner br" />

              <div className="camera-status">
                {detected
                  ? "💖 WAJAH TERDETEKSI"
                  : "🔍 MENCARI WAJAH..."}
              </div>
            </>
          )}

          {detected && (
            <div className="heart-overlay">💗</div>
          )}
        </div>

        <div className="status-text" aria-live="polite">
          {detected
            ? `✨ Cinta ditemukan untuk ${nama || "Sayangku"}!`
            : cameraOn
              ? "Arahkan wajah ke kamera..."
              : "Kisah cinta kita dimulai di sini."}
        </div>

        {/* Pesan romantis */}
        {detected && (
          <div className="message" key={pesan}>
            <div className="message-heart">💌</div>
            <h2>Untuk {nama || "Sayangku"}</h2>
            <p>{kataCinta[pesan]}</p>
            <div className="love-signature">
              Forever, with love ♡
            </div>
          </div>
        )}

        {/* Kontrol kamera */}
        <button
          className="camera-button"
          onClick={cameraOn ? stopCamera : startCamera}
          disabled={loading}
        >
          {loading ? (
            "Menyiapkan keajaiban..."
          ) : cameraOn ? (
            <>
              <CameraOff size={19} />
              Matikan Kamera
            </>
          ) : (
            <>
              <Camera size={19} />
              Mulai Scan Cinta
            </>
          )}
        </button>

        {/* Kontrol musik */}
        <div className="music-player">
          <div className="music-info">
            <div className="music-icon">
              <Music2 size={25} />
            </div>
            <div>
              <strong>Melodi Untukmu 💗</strong>
              <small>
                {musicOn
                  ? "♫ Sedang memutar lagu cinta..."
                  : "Musik sedang dijeda"}
              </small>
            </div>
          </div>

          <button
            className="music-toggle"
            onClick={toggleMusic}
          >
            {musicOn ? (
              <>
                <Pause size={17} />
                Pause Musik
              </>
            ) : (
              <>
                <Play size={17} />
                Putar Musik
              </>
            )}
          </button>

          <div className="volume-control">
            <Volume2 size={17} />
            <input
              type="range"
              aria-label="Volume musik"
              min="0"
              max="100"
              value={volume}
              onChange={e => {
                const value = Number(e.target.value);
                setVolume(value);

                if (audioRef.current) {
                  audioRef.current.volume = value / 100;
                }
              }}
            />
            <span>{volume}%</span>
          </div>

          {musicError && (
            <p className="music-error">
              ⚠️ {musicError}
            </p>
          )}
        </div>

        <footer>
          Made with endless love 💗
        </footer>
      </section>
    </main>
  );
}
