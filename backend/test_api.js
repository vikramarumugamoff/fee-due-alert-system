async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: res.status, data };
}

async function getJson(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const text = await res.text();
  let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: res.status, data };
}

async function run() {
  try {
    console.log('Signing up test student...');
    const signupRes = await postJson('http://localhost:5000/signup', {
      fullName: 'Test Student',
      studentId: '2026-CSE-999',
      department: 'CSE',
      email: 'teststudent@student.bitsathy.ac.in',
      phone: '+91 99999 99999',
      password: 'Test@1234'
    });
    console.log('Signup status:', signupRes.status, 'data:', signupRes.data);
  } catch (e) {
    console.error('Signup error', e);
  }

  try {
    console.log('Logging in test student...');
    const loginRes = await postJson('http://localhost:5000/login', {
      email: 'teststudent@student.bitsathy.ac.in',
      password: 'Test@1234',
      role: 'student'
    });
    console.log('Login status:', loginRes.status, 'data:', loginRes.data);
    const token = loginRes.data.token;
    if (!token) return console.error('No token received');

    console.log('Calling /me with token...');
    const me = await getJson('http://localhost:5000/me', token);
    console.log('/me status:', me.status, 'data:', me.data);
  } catch (e) {
    console.error('Login/me error', e);
  }
}

run();
