import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        process.env[match[1]] = value.trim();
      }
    }
  }
} catch {
  // Ignore
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("Connecting to:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function measure() {
  const times: number[] = [];
  for (let i = 1; i <= 5; i++) {
    const start = performance.now();
    try {
      // Query a lightweight health check / select 1 equivalent
      const { data, error } = await supabase.from("companies").select("id").limit(1);
      const dur = performance.now() - start;
      times.push(dur);
      console.log(`Roundtrip #${i}: ${dur.toFixed(2)}ms (error: ${error?.message || "none"})`);
    } catch (err: any) {
      const dur = performance.now() - start;
      times.push(dur);
      console.log(`Roundtrip #${i}: ${dur.toFixed(2)}ms (failed: ${err?.message})`);
    }
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`\nAverage Roundtrip Time (RTT): ${avg.toFixed(2)}ms`);
}

measure();
