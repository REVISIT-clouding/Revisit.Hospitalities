"use client";
import { useState, useRef, useEffect } from "react";
import {
  Mic, MicOff, Loader2, X, Check, Stethoscope,
  FileText, RefreshCw, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";
import supabase from "@/lib/supabase";

const FIELDS = [
  { key: "chief_complaint", label: "Chief Complaint", color: "teal"    },
  { key: "symptoms",        label: "Symptoms",         color: "blue"    },
  { key: "vitals",          label: "Vitals",           color: "violet"  },
  { key: "diagnosis",       label: "Diagnosis",        color: "emerald" },
  { key: "prescription",    label: "Prescription",     color: "amber"   },
  { key: "follow_up",       label: "Follow-up",        color: "orange"  },
  { key: "notes",           label: "Additional Notes", color: "slate"   },
];

const COLOR_MAP = {
  teal:    { bg: "bg-teal-50",    border: "border-teal-200",    text: "text-teal-700",    dot: "bg-teal-500"    },
  blue:    { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    dot: "bg-blue-500"    },
  violet:  { bg: "bg-violet-50",  border: "border-violet-200",  text: "text-violet-700",  dot: "bg-violet-500"  },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  amber:   { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   dot: "bg-amber-500"   },
  orange:  { bg: "bg-orange-50",  border: "border-orange-200",  text: "text-orange-700",  dot: "bg-orange-500"  },
  slate:   { bg: "bg-slate-50",   border: "border-slate-200",   text: "text-slate-600",   dot: "bg-slate-400"   },
};

const EMPTY_NOTES = {
  chief_complaint: "", symptoms: "", vitals: "",
  diagnosis: "", prescription: "", follow_up: "", notes: "",
};

export default function ConsultationRecorder({ appointment, onClose, onSaved }) {
  const [phase,      setPhase]      = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [interim,    setInterim]    = useState("");
  const [notes,      setNotes]      = useState(EMPTY_NOTES);
  const [error,      setError]      = useState("");
  const [showRaw,    setShowRaw]    = useState(false);
  const [pulse,      setPulse]      = useState(false);

  const recognitionRef = useRef(null);
  const finalRef       = useRef("");
  const interimRef     = useRef("");

  /* pulse while recording */
  useEffect(() => {
    if (phase !== "recording") return;
    const id = setInterval(() => setPulse((p) => !p), 600);
    return () => clearInterval(id);
  }, [phase]);

  /* cleanup on unmount */
  useEffect(() => () => recognitionRef.current?.stop(), []);

  /* ── START RECORDING ── */
  function startRecording() {
    setError("");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice recording requires Chrome or Edge browser.");
      return;
    }

    finalRef.current   = "";
    interimRef.current = "";
    setTranscript("");
    setInterim("");

    const rec = new SpeechRecognition();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang           = "en-GB";

    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t + " ";
        else interimText += t;
      }
      interimRef.current = interimText;
      setTranscript(finalRef.current);
      setInterim(interimText);
    };

    recognitionRef.onerror = (event) => {
  console.error("Speech Error:", event.error);
  if (event.error === 'network' || event.error === 'no-speech') {
    // Optional: toast a message to the user
    // recognition.start(); // Be careful with infinite loops! 
      if (e.error !== "no-speech") setError(`Microphone error: ${e.error}`);
  }
    };

    

    recognitionRef.current = rec;
    rec.start();
    setPhase("recording");
  }

  /* ── STOP + SEND TO CLAUDE ── */
async function stopAndProcess() {
  recognitionRef.current?.stop();
  setInterim("");
  setPhase("processing");

  const fullTranscript = (finalRef.current + interimRef.current).trim();
  
  if (!fullTranscript) {
    setError("No speech detected.");
    setPhase("idle");
    return;
  }

  try {
    // Call your internal Next.js API instead of Anthropic
    const res = await fetch("/api/scribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: fullTranscript }),
    });

    const data = await res.json();
    
    // Extract text from Claude's response structure
    const raw = data.content?.[0]?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    setNotes({ ...EMPTY_NOTES, ...parsed });
    setPhase("review");
  } catch (err) {
    console.error("Scribe Error:", err);
    setError("AI processing failed. You can type notes manually.");
    setPhase("review");
  }
}
  /* ── SAVE TO SUPABASE ── */
  async function handleSave() {
    setPhase("saving");
    try {
      const { error: err } = await supabase.from("consultation_notes").insert([{
        hospital_id:     appointment.hospital_id,
        appointment_id:  appointment.id,
        patient_id:      appointment.patient_id || null,
        patient_name:    appointment.patient_name,
        raw_transcript:  transcript,
        chief_complaint: notes.chief_complaint,
        symptoms:        notes.symptoms,
        vitals:          notes.vitals,
        diagnosis:       notes.diagnosis,
        prescription:    notes.prescription,
        follow_up:       notes.follow_up,
        notes:           notes.notes,
      }]);

      if (err) throw err;

      await supabase.from("appointments")
        .update({ status: "Completed" })
        .eq("id", appointment.id);

      setPhase("saved");
      onSaved?.();
    } catch (e) {
      setError(e.message);
      setPhase("review");
    }
  }

  /* ── RENDER ── */
  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm"
        style={{ animation: "fadeIn .15s" }}
        onClick={phase === "recording" ? undefined : onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" style={{ animation: "popIn .2s" }}>
        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-100">

          {/* header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center">
              <Stethoscope size={15} className="text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-slate-900">AI Consultation Recorder</h3>
              <p className="text-[10px] text-slate-400 truncate">{appointment.patient_name} · {appointment.type}</p>
            </div>
            {phase !== "recording" && (
              <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-500 transition">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {/* IDLE / RECORDING */}
            {(phase === "idle" || phase === "recording") && (
              <>
                <div className="flex flex-col items-center justify-center py-6 gap-4">
                  <div className="relative">
                    {phase === "recording" && (
                      <div className="absolute inset-0 rounded-full bg-red-400 opacity-20 scale-125 animate-ping" />
                    )}
                    <button
                      onClick={phase === "idle" ? startRecording : stopAndProcess}
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                        phase === "recording"
                          ? "bg-red-500 hover:bg-red-600 scale-110"
                          : "bg-teal-600 hover:bg-teal-500"
                      }`}>
                      {phase === "recording"
                        ? <MicOff size={28} className="text-white" />
                        : <Mic    size={28} className="text-white" />}
                    </button>
                  </div>
                  <div className="text-center">
                    {phase === "idle" ? (
                      <>
                        <p className="text-sm font-black text-slate-800">Tap to start recording</p>
                        <p className="text-xs text-slate-400 mt-1">Speak naturally during the consultation</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-black text-red-600 flex items-center gap-2 justify-center">
                          <span className={`w-2 h-2 rounded-full bg-red-500 transition-opacity ${pulse ? "opacity-100" : "opacity-30"}`} />
                          Recording… tap to stop
                        </p>
                        <p className="text-xs text-slate-400 mt-1">AI will structure your notes automatically</p>
                      </>
                    )}
                  </div>
                </div>

                {(transcript || interim) && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Transcript</p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {transcript}
                      {interim && <span className="text-slate-400 italic">{interim}</span>}
                    </p>
                  </div>
                )}

                <div className="bg-teal-50 border border-teal-100 rounded-2xl px-4 py-3">
                  <p className="text-[10px] font-bold text-teal-700 leading-relaxed">
                    💡 Speak naturally — mention the complaint, symptoms, vitals, diagnosis, and prescription. AI will organise everything.
                  </p>
                </div>
              </>
            )}

            {/* PROCESSING */}
            {phase === "processing" && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                    <Sparkles size={24} className="text-teal-500" />
                  </div>
                  <Loader2 size={14} className="animate-spin text-teal-500 absolute -top-1 -right-1" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-800">Structuring notes…</p>
                  <p className="text-xs text-slate-400 mt-1">AI is organising the consultation</p>
                </div>
              </div>
            )}

            {/* REVIEW */}
            {(phase === "review" || phase === "saving") && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-slate-700 flex items-center gap-2">
                    <Sparkles size={12} className="text-teal-500" />
                    AI-structured notes — review &amp; edit before saving
                  </p>
                  <button
                    onClick={() => {
                      setPhase("idle");
                      setNotes(EMPTY_NOTES);
                      setTranscript("");
                      finalRef.current   = "";
                      interimRef.current = "";
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-teal-600 flex items-center gap-1 transition">
                    <RefreshCw size={10} /> Re-record
                  </button>
                </div>

                <div className="space-y-3">
                  {FIELDS.map(({ key, label, color }) => {
                    const c = COLOR_MAP[color];
                    return (
                      <div key={key} className={`${c.bg} border ${c.border} rounded-2xl p-3`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                          <label className={`text-[9px] font-black uppercase tracking-widest ${c.text}`}>{label}</label>
                        </div>
                        <textarea
                          value={notes[key]}
                          onChange={(e) => setNotes((n) => ({ ...n, [key]: e.target.value }))}
                          rows={key === "prescription" || key === "symptoms" ? 2 : 1}
                          placeholder="Not mentioned"
                          className="w-full bg-transparent text-xs text-slate-700 outline-none resize-none placeholder:text-slate-300 leading-relaxed"
                        />
                      </div>
                    );
                  })}
                </div>

                {transcript && (
                  <button onClick={() => setShowRaw((p) => !p)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition">
                    <FileText size={10} />
                    {showRaw ? "Hide" : "Show"} raw transcript
                    {showRaw ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </button>
                )}
                {showRaw && transcript && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <p className="text-[10px] text-slate-500 leading-relaxed italic">{transcript}</p>
                  </div>
                )}
              </>
            )}

            {/* SAVED */}
            {phase === "saved" && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                  <Check size={28} className="text-white" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-800">Consultation saved!</p>
                  <p className="text-xs text-slate-400 mt-1">Notes added to {appointment.patient_name}'s record</p>
                </div>
                <button onClick={onClose}
                  className="mt-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-black rounded-xl transition">
                  Done
                </button>
              </div>
            )}

            {/* error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* footer */}
          {(phase === "review" || phase === "saving") && (
            <div className="px-6 py-4 border-t border-slate-100 flex gap-2 shrink-0">
              <button onClick={onClose}
                className="flex-1 py-2.5 text-xs font-bold text-slate-500 rounded-xl bg-slate-100 hover:bg-slate-200 transition">
                Discard
              </button>
              <button onClick={handleSave} disabled={phase === "saving"}
                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-black py-2.5 rounded-xl transition">
                {phase === "saving"
                  ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                  : <><Check size={13} /> Save to Patient Record</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}