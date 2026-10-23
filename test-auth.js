/**
 * Automated Verification Script for Practical 7: Authentication & Middleware Pipeline
 * Runs full test suite verifying Registration, Password Hashing, Login,
 * JWT Verification, Auth Middleware protection, Validation Middleware, and /me endpoint.
 */

const BASE_URL = process.env.TEST_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log("==========================================================");
  console.log("   Practical 7: Automated Auth & Middleware Test Suite    ");
  console.log("==========================================================");
  console.log(`Target API: ${BASE_URL}\n`);

  const timestamp = Date.now();
  const testUser = {
    name: "Lab Tester",
    email: `student_${timestamp}@example.com`,
    password: "SecurePassword123!"
  };

  let token = null;

  // 1. Protected route test without token (Should be 401)
  console.log("[1/9] Testing GET /tasks without Authorization header...");
  const resNoAuth = await request("/tasks");
  assert(resNoAuth.status === 401, `Expected 401 Unauthorized, received ${resNoAuth.status}`);
  assert(resNoAuth.data?.error?.includes("missing") || resNoAuth.data?.message?.includes("No token"), "Auth error response received correctly");

  // 2. Protected route test with malformed token (Should be 401)
  console.log("\n[2/9] Testing GET /tasks with malformed token...");
  const resBadToken = await request("/tasks", {
    headers: { Authorization: "Bearer invalid.token.payload" }
  });
  assert(resBadToken.status === 401, `Expected 401 for bad token, received ${resBadToken.status}`);

  // 3. User Registration
  console.log(`\n[3/9] Registering user: ${testUser.email}...`);
  const resReg = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(testUser)
  });
  assert(resReg.status === 201, `Expected 201 Created, received ${resReg.status}`);
  assert(Boolean(resReg.data.token), "JWT token returned upon registration");
  assert(resReg.data.user.email === testUser.email, "Registered email matches");
  assert(!resReg.data.user.password, "Password is NOT exposed in response");

  // 4. Duplicate Registration rejection
  console.log("\n[4/9] Testing duplicate email registration rejection...");
  const resDup = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(testUser)
  });
  assert(resDup.status === 409, `Expected 409 Conflict, received ${resDup.status}`);

  // 5. Login with invalid password
  console.log("\n[5/9] Testing login with incorrect password...");
  const resBadLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: testUser.email, password: "WrongPassword999" })
  });
  assert(resBadLogin.status === 401, `Expected 401 Unauthorized, received ${resBadLogin.status}`);

  // 6. Login with correct password
  console.log("\n[6/9] Logging in with correct credentials...");
  const resLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: testUser.email, password: testUser.password })
  });
  assert(resLogin.status === 200, `Expected 200 OK, received ${resLogin.status}`);
  assert(Boolean(resLogin.data.token), "Valid JWT token obtained");
  token = resLogin.data.token;

  // 7. Test /me endpoint with token
  console.log("\n[7/9] Accessing /me endpoint with JWT token...");
  const resMe = await request("/me", {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(resMe.status === 200, `Expected 200 OK, received ${resMe.status}`);
  assert(resMe.data.user.email === testUser.email, "/me correctly returns authenticated user data");

  // 8. Test Validation Middleware on POST /tasks (missing title)
  console.log("\n[8/9] Testing Validation Middleware: POST /tasks with missing title...");
  const resVal = await request("/tasks", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ description: "Missing title", priority: "high" })
  });
  assert(resVal.status === 400, `Expected 400 Bad Request, received ${resVal.status}`);
  assert(resVal.data.error === "Input validation failed", "Validation middleware rejected request before DB");

  // 9. Create task with valid title and priority
  console.log("\n[9/9] Testing POST /tasks with valid data...");
  const resCreateTask = await request("/tasks", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: "Complete Practical 7 Lab",
      description: "Implement JWT auth and validation middleware",
      priority: "high"
    })
  });
  assert(resCreateTask.status === 201, `Expected 201 Created, received ${resCreateTask.status}`);
  assert(resCreateTask.data.title === "Complete Practical 7 Lab", "Task saved with correct title");

  // Retrieve tasks
  const resList = await request("/tasks", {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(resList.status === 200, "Successfully fetched tasks list for user");
  assert(resList.data.length >= 1, "User's tasks retrieved successfully");

  console.log("\n==========================================================");
  console.log("   🎉 ALL PRACTICAL 7 TESTS PASSED SUCCESSFULLY!          ");
  console.log("==========================================================");
}

runTests().catch((err) => {
  console.error("\n❌ Test suite failed:", err.message);
  process.exit(1);
});
