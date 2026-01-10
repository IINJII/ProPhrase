import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  // 1. Ramp up to 10 users over 10 seconds
  // 2. Stay there for 20 seconds
  // 3. Ramp down
  stages: [
    { duration: "10s", target: 5 },
    { duration: "20s", target: 5 },
    { duration: "5s", target: 5 },
  ],
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
        content: `rephrase the message in a professional tone. message: i'm so grateful for your help with this, and i really appreciate it!`,
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
