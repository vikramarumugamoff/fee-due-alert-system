const API_URL = 'http://localhost:5000';
const ADMIN_EMAIL = 'admin@bitsathy.ac.in';
const ADMIN_PASS = 'Admin@1234';

async function verify() {
    try {
        // 1. Login as Admin
        console.log('Logging in as Admin...');
        const loginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: ADMIN_EMAIL,
                password: ADMIN_PASS,
                role: 'admin'
            })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.statusText}`);
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('✅ Admin logged in');

        // 2. Get Initial Stats
        console.log('Fetching initial stats...');
        const stats1Res = await fetch(`${API_URL}/admin/dashboard-stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!stats1Res.ok) throw new Error(`Stats fetch failed: ${stats1Res.statusText}`);
        const stats1 = await stats1Res.json();
        console.log('Initial Stats:', stats1);

        if (stats1.totalStudents < 1304) throw new Error('Total Students count too low');
        if (stats1.totalFeeCollected < 212000000) throw new Error('Fees Collected too low');
        if (stats1.totalPendingFee < 1300000) throw new Error('Pending Fee too low');

        // 3. Create a New Student
        const newStudentId = `test_${Date.now()}`;
        const newStudentEmail = `${newStudentId}@bitsathy.ac.in`;
        console.log(`Creating new student: ${newStudentEmail}`);

        const signupRes = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'Test Student',
                studentId: newStudentId,
                email: newStudentEmail,
                phone: '1234567890',
                department: 'CSE',
                password: 'Password@123'
            })
        });

        if (!signupRes.ok) {
            const errText = await signupRes.text();
            throw new Error(`Signup failed: ${errText}`);
        }
        console.log('✅ Student created');

        // 4. Get Stats Again
        console.log('Fetching stats again...');
        const stats2Res = await fetch(`${API_URL}/admin/dashboard-stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!stats2Res.ok) throw new Error(`Stats fetch failed: ${stats2Res.statusText}`);
        const stats2 = await stats2Res.json();
        console.log('New Stats:', stats2);

        // 5. Verify Increment
        const studentDiff = stats2.totalStudents - stats1.totalStudents;
        const feeDiff = stats2.totalPendingFee - stats1.totalPendingFee;

        console.log(`Student Count Diff: ${studentDiff}`);
        console.log(`Pending Fee Diff: ${feeDiff}`);

        if (studentDiff !== 1) throw new Error('Total Students did not increment by 1');
        if (feeDiff !== 275000) throw new Error('Pending Fee did not increment by 275,000');

        console.log('✅ VERIFICATION PASSED');

    } catch (err) {
        console.error('❌ VERIFICATION FAILED:', err.message);
        process.exit(1);
    }
}

verify();
