/**
 * Cloudflare Pages Function: /api/notes
 * 
 * Handles POST requests from your PWA form submission.
 * For now, it echoes the text sent from the client.
 * You can later connect this to Cloudflare D1, KV, or Supabase.
 */

export async function onRequestPost({ request }) {
  try {
    const data = await request.json();
    const text = (data && data.text) || "(empty)";

    // Simulate "server saved note" with timestamp
    const response = {
      ok: true,
      message: "Note received successfully",
      received: {
        text,
        timestamp: new Date().toISOString()
      }
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Optional GET handler — lets you test from your browser:
 * https://your-site.pages.dev/api/notes
 */
export async function onRequestGet() {
  const message = {
    ok: true,
    info: "This endpoint accepts POST requests with JSON { text: 'your note' }",
    example: {
      method: "POST",
      url: "/api/notes",
      body: { text: "Hello world" }
    }
  };

  return new Response(JSON.stringify(message, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
}
