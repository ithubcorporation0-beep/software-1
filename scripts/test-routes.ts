async function testRoutes() {
  const routes = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/sales",
    "/finance",
    "/inventory",
    "/crm",
    "/hr",
    "/payroll",
    "/projects",
    "/reports",
    "/settings",
    "/notifications",
    "/admin",
    "/icon.svg",
    "/favicon.ico",
  ];

  console.log("Testing all routes on http://localhost:3000:");
  let failures = 0;
  for (const r of routes) {
    try {
      const res = await fetch("http://localhost:3000" + r, {
        redirect: "manual",
      });
      // 200 (OK) or 307/308 (Redirect to login when unauthenticated) are successful responses
      const ok = res.status === 200 || res.status === 307 || res.status === 308;
      console.log(
        `${r.padEnd(22)} HTTP ${res.status} [${ok ? "PASS" : "FAIL"}]`
      );
      if (!ok && res.status !== 401 && res.status !== 403) {
        failures++;
      }
    } catch (err: any) {
      console.error(`${r.padEnd(22)} ERROR: ${err.message}`);
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`Encountered ${failures} unexpected HTTP errors.`);
    process.exit(1);
  } else {
    console.log("All route endpoints responded correctly without errors!");
  }
}

testRoutes();
