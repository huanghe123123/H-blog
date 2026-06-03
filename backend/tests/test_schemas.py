import pytest
from pydantic import ValidationError

from app.schemas.like import LikeRequest
from app.schemas.user import UserRegister


def test_user_register_validation():
    user = UserRegister(username="alice_1", email="alice@example.com", password="password123")

    assert user.username == "alice_1"


def test_like_target_type_validation():
    with pytest.raises(ValidationError):
        LikeRequest(target_type="profile", target_id=1)
