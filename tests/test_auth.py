import os
import sys

# Add backend directory to sys.path so modules can be resolved
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# pyrefly: ignore [missing-import]
from app import app
# pyrefly: ignore [missing-import]
from models import get_connection
from werkzeug.security import generate_password_hash

client = app.test_client()

def run_tests():
    print("Testing 1: Missing fields validation...")
    res = client.post('/api/auth/login', json={})
    assert res.status_code == 400, f"Expected 400, got {res.status_code}"

    print("Testing 2: Invalid credentials rejection...")
    res = client.post('/api/auth/login', json={'user_id': 'admin', 'password': 'wrongpassword'})
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"

    print("Testing 3: Successful admin login...")
    res = client.post('/api/auth/login', json={'user_id': 'admin', 'password': 'MalaiVizhi@2025'})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.data}"
    data = res.get_json()
    assert data['success'] is True
    token = data['token']
    assert data['user']['user_id'] == 'admin'

    print("Testing 4: Verify session via /api/auth/me...")
    res = client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    me = res.get_json()
    assert me['user']['user_id'] == 'admin'

    print("Testing 5: Operator login...")
    res_op = client.post('/api/auth/login', json={'user_id': 'operator', 'password': 'Operator#2025'})
    assert res_op.status_code == 200
    assert res_op.get_json()['user']['role'] == 'Operator'

    print("Testing 6: Forgot password request...")
    res_fp = client.post('/api/auth/forgot-password', json={'user_id': 'admin'})
    assert res_fp.status_code == 200
    fp_data = res_fp.get_json()
    assert fp_data['success'] is True

    # Retrieve reset code
    reset_code = fp_data.get('reset_code')
    if not reset_code:
        # In case debug flag was false, read code from test harness or check DB record exists
        c = get_connection()
        rec = c.execute("SELECT * FROM password_resets WHERE user_id = 'admin' AND used = 0").fetchone()
        assert rec is not None

    print("Testing 7: Reset password with invalid code rejected...")
    res_invalid_code = client.post('/api/auth/reset-password', json={
        'user_id': 'admin',
        'reset_code': '000000',
        'new_password': 'NewPassword@2025'
    })
    assert res_invalid_code.status_code == 400

    print("Testing 8: Reset password with valid code...")
    # Generate a known reset code and hash
    import hashlib
    test_code = "654321"
    test_hash = hashlib.sha256(test_code.encode("utf-8")).hexdigest()
    c = get_connection()
    c.execute("UPDATE password_resets SET used = 1 WHERE user_id = 'admin'")
    c.execute("INSERT INTO password_resets (user_id, token_hash, expires_at, used) VALUES ('admin', ?, datetime('now', '+15 minutes'), 0)", (test_hash,))
    c.commit()

    res_reset = client.post('/api/auth/reset-password', json={
        'user_id': 'admin',
        'reset_code': test_code,
        'new_password': 'UpdatedSecret#2025'
    })
    assert res_reset.status_code == 200, f"Reset failed: {res_reset.data}"

    # Previous session token should now be invalidated
    res_old_token = client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert res_old_token.status_code == 401

    # Login with new password should succeed
    res_new_login = client.post('/api/auth/login', json={'user_id': 'admin', 'password': 'UpdatedSecret#2025'})
    assert res_new_login.status_code == 200
    new_token = res_new_login.get_json()['token']

    print("Testing 9: Logout session invalidation...")
    res_logout = client.post('/api/auth/logout', headers={'Authorization': f'Bearer {new_token}'})
    assert res_logout.status_code == 200

    res_after_logout = client.get('/api/auth/me', headers={'Authorization': f'Bearer {new_token}'})
    assert res_after_logout.status_code == 401

    # Reset admin password back to standard default
    c = get_connection()
    c.execute("UPDATE users SET password_hash = ? WHERE user_id = 'admin'", (generate_password_hash('MalaiVizhi@2025'),))
    c.commit()

    print("✅ ALL 9 BACKEND AUTHENTICATION AND PASSWORD RESET TESTS PASSED!")

if __name__ == "__main__":
    run_tests()
