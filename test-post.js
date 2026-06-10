async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: "test-account",
        block: { id: "123", timestamp: new Date().toISOString(), content: "test" }
      })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}
run();
