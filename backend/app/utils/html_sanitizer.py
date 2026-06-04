import nh3

ALLOWED_TAGS = {"strong", "em", "s", "del", "code", "a", "br", "p", "b", "i"}
ALLOWED_ATTRS = {"a": {"href", "target"}}


def sanitize_html(html: str) -> str:
    return nh3.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        link_rel=None,  # disable nh3's automatic rel to avoid conflict
    ).strip()
