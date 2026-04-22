from app.core.security import verify_totp_code


def test_verify_totp_code_accepts_valid_rfc_vector():
    # RFC 6238 test secret for SHA1
    secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
    assert verify_totp_code(secret, "94287082", at_time=59, window=0) is True


def test_verify_totp_code_rejects_invalid_code():
    secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
    assert verify_totp_code(secret, "00000000", at_time=59, window=0) is False
