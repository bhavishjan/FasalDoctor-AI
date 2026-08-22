import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      // Close stream if client disconnects
      request.signal.addEventListener('abort', () => {
        isClosed = true;
      });

      // Heartbeat ping every 5 seconds
      const heartbeatInterval = setInterval(() => {
        if (!isClosed) {
          controller.enqueue(
            encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`)
          );
        }
      }, 5000);

      // Telemetry events every 2 seconds
      const telemetryInterval = setInterval(() => {
        if (!isClosed) {
          const regions = ['Multan', 'Faisalabad', 'Sukkur', 'Peshawar'];
          const diseases = ['Healthy', 'Wheat Rust', 'Corn Blight', 'Cotton Curl Virus', 'Sugarcane Red Rot'];
          
          const eventData = {
            node_id: `node-${Math.random().toString(36).substring(7)}`,
            region: regions[Math.floor(Math.random() * regions.length)],
            disease_detected: diseases[Math.floor(Math.random() * diseases.length)],
            confidence: 0.7 + (Math.random() * 0.29),
            execution_time_ms: Math.floor(Math.random() * 500) + 50,
            timestamp: new Date().toISOString()
          };

          controller.enqueue(
            encoder.encode(`event: telemetry\ndata: ${JSON.stringify(eventData)}\n\n`)
          );
        }
      }, 2000);

      // Stop after 5 minutes
      setTimeout(() => {
        isClosed = true;
        clearInterval(heartbeatInterval);
        clearInterval(telemetryInterval);
        controller.close();
      }, 5 * 60 * 1000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        clearInterval(telemetryInterval);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
