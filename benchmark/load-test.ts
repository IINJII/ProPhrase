import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 8,
  duration: "30s",
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

export default function () {
  const payload = JSON.stringify({
    model: "llama3.2:1b",
    keep_alive: -1,
    messages: [
      {
        role: "system",
        content: `You are a message rephrasing assistant. Follow these rules exactly:

                  1. Rewrite the message in the specified tone
                  2. Output ONLY the rewritten text
                  3. Do NOT include:
                    - "Here is" or "Here's"
                    - "In a [tone] tone"
                    - "Rephrased version"
                    - Any explanations
                    - Any meta-commentary

                  Examples:

                  Input: Tone: professional | Message: hey can u help
                  Output: Could you please assist me?

                  Input: Tone: casual | Message: skdnfjkds nfkjn kjnfkjsndfjk sndkjf nskjdfns
                  Output: skdnfjkds nfkjn kjnfkjsndfjk sndkjf nskjdfns

                  Now rewrite the message below following these exact rules.`,
      },
      {
        role: "user",
        content: `rephrase the message in a professional tone. message: I'm excited to dive into this project with you! I've been eager to explore the possibilities of integrating our own DSP (Demand Side Platform) with ad slots on our website, allowing us to run, test, and showcase campaigns using our platform and inventory. With GPT at our disposal, this process has become significantly easier for research, prototyping, and implementation.`,
      },
    ],
    stream: false,
  });

  const params = {
    headers: { "Content-Type": "application/json" },
  };

  const res = http.post("http://localhost:11434/api/chat", payload, params);

  // Assert that the request worked and took less than 5 seconds
  check(res, {
    "is status 200": (r) => r.status === 200,
    "latency < 5s": (r) => r.timings.duration < 5000,
  });

  console.log(res.body);

  sleep(1);
}
