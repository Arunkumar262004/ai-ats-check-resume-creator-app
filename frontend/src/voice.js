// Text-to-speech helpers (browser Web Speech API — free, offline-capable, no API key).
// Prefers a pleasant MALE English voice; the user can switch voices in the guide panel.

const FEMALE = /zira|heera|hazel|susan|samantha|jenny|aria|female|catherine|linda|sara|emma|neerja|swara|kalpana|veena|karen|moira|tessa|fiona|victoria|ava\b|sonia|libby|natasha|clara|michelle|ana\b|eva\b|zoe|allison|joanna|kendra|kimberly|salli|ivy/i;
const MALE_PREFERENCE = ["prabhat", "ryan", "guy", "davis", "christopher", "eric", "brian", "andrew", "ravi", "mark", "david", "daniel", "alex", "james", "george", "google uk english male", "male"];

export const supported = typeof window !== "undefined" && "speechSynthesis" in window;

export function loadVoices() {
  return new Promise((resolve) => {
    if (!supported) return resolve([]);
    const have = window.speechSynthesis.getVoices();
    if (have.length) return resolve(have);
    window.speechSynthesis.onvoiceschanged = () => resolve(window.speechSynthesis.getVoices());
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500);
  });
}

export const englishVoices = (voices) => voices.filter((v) => /^en[-_]/i.test(v.lang) || /english/i.test(v.name));

export function pickMaleVoice(voices, savedName) {
  const en = englishVoices(voices);
  if (savedName) { const s = en.find((v) => v.name === savedName); if (s) return s; }
  const lower = (v) => v.name.toLowerCase();
  for (const key of MALE_PREFERENCE) {
    const hit = en.find((v) => lower(v).includes(key) && !FEMALE.test(v.name));
    if (hit) return hit;
  }
  return en.find((v) => !FEMALE.test(v.name)) || en[0] || voices[0] || null;
}

export const savedVoice = () => { try { return localStorage.getItem("voiceName") || ""; } catch { return ""; } };
export const saveVoice = (n) => { try { localStorage.setItem("voiceName", n); } catch { /* ignore */ } };

export function stopSpeaking() { if (supported) window.speechSynthesis.cancel(); }

/** Speak text with the chosen (or best male) voice. Returns the utterance. */
export async function speak(text, { voice, rate = 0.95, pitch = 0.9, onend, onerror } = {}) {
  if (!supported) return null;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = voice || pickMaleVoice(await loadVoices(), savedVoice());
  if (v) { u.voice = v; u.lang = v.lang; }
  u.rate = rate; u.pitch = pitch; u.volume = 1;
  u.onend = () => onend && onend();
  u.onerror = (e) => { if (e.error !== "canceled" && e.error !== "interrupted") onerror && onerror(e); };
  synth.speak(u);
  return u;
}
