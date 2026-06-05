class UserRole:
    GUEST = "guest"
    USER = "user"
    MODERATOR = "moderator"
    ADMIN = "admin"
    OWNER = "owner"

    @classmethod
    def choices(cls) -> list[str]:
        return [cls.GUEST, cls.USER, cls.MODERATOR, cls.ADMIN, cls.OWNER]
