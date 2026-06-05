import re

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.comment import Comment
from app.models.post import Post
from app.models.user import User
from app.schemas.comment import CommentCreate
from app.utils.html_sanitizer import sanitize_html


def _strip_html(html: str) -> str:
    return re.sub(r"<[^>]*>", "", html).strip()


def _preview(html: str, length: int = 10) -> str | None:
    text = _strip_html(html)
    if not text:
        return None
    return text[:length] + ("..." if len(text) > length else "")


def create_comment(
    db: Session,
    user: User,
    payload: CommentCreate,
    post: Post | None = None,
    profile_user: User | None = None,
) -> Comment:
    content = sanitize_html(payload.content)
    if not content or not _strip_html(content):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="评论内容不能为空")

    reply_to_user_id = payload.reply_to_user_id
    reply_preview = payload.reply_preview
    if payload.parent_id is not None:
        parent = get_comment_or_404(db, payload.parent_id)
        if reply_to_user_id is None:
            reply_to_user_id = parent.user_id
        if reply_preview is None:
            reply_preview = _preview(parent.content)

    comment = Comment(
        content=content,
        post_id=post.id if post else None,
        profile_id=profile_user.id if profile_user else None,
        user_id=user.id,
        parent_id=payload.parent_id,
        reply_to_user_id=reply_to_user_id,
        reply_preview=reply_preview,
    )
    db.add(comment)
    db.commit()
    return get_comment_or_404(db, comment.id)


def list_comments(db: Session, post_id: int | None = None, profile_id: int | None = None) -> list[Comment]:
    query = (
        select(Comment)
        .options(
            joinedload(Comment.user),
            joinedload(Comment.reply_to_user),
        )
        .order_by(Comment.created_at.asc())
    )
    if post_id is not None:
        query = query.where(Comment.post_id == post_id)
    elif profile_id is not None:
        query = query.where(Comment.profile_id == profile_id)
    all_comments = list(db.scalars(query).unique())
    return build_comment_tree(all_comments)


def build_comment_tree(comments: list[Comment]) -> list[Comment]:
    comment_map: dict[int, Comment] = {}
    roots: list[Comment] = []

    for c in comments:
        comment_map[c.id] = c
        c.replies = []

    for c in comments:
        if c.parent_id is not None and c.parent_id in comment_map:
            comment_map[c.parent_id].replies.append(c)
        else:
            roots.append(c)

    return roots


def get_comment_or_404(db: Session, comment_id: int) -> Comment:
    comment = db.scalar(
        select(Comment)
        .options(joinedload(Comment.user), joinedload(Comment.reply_to_user))
        .where(Comment.id == comment_id)
    )
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    return comment


def delete_comment(db: Session, comment: Comment, user: User) -> None:
    if comment.user_id != user.id and user.role not in ("admin", "owner"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="只有作者或管理员可以删除此评论")
    db.delete(comment)
    db.commit()
