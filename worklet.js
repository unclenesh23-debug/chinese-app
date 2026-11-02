/* Запись голоса: сырые отсчёты для графика тона + уровень для полоски. Шлёт кусками ≈ по 50 мс. */
class Rec extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(2400); this.n = 0; this.sum = 0; this.peak = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        const x = ch[i];
        this.buf[this.n++] = x;
        this.sum += x * x;
        const a = x < 0 ? -x : x;
        if (a > this.peak) this.peak = a;
        if (this.n === this.buf.length) {
          this.port.postMessage({ rms: Math.sqrt(this.sum / this.n), peak: this.peak, pcm: this.buf }, [this.buf.buffer]);
          this.buf = new Float32Array(2400); this.n = 0; this.sum = 0; this.peak = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor("rec", Rec);
