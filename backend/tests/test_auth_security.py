from app.utils.security import get_password_hash, verify_password


def test_password_hash_verification():
    hashed = get_password_hash("strong-password")

    assert hashed != "strong-password"
    assert verify_password("strong-password", hashed)
    assert not verify_password("wrong-password", hashed)
