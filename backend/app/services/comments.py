from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.comment import Comment
from app.models.post import Post
from app.models.user import User
from app.schemas.comment import CommentCreate


def create_comment(db: Session, post: Post, user: User, payload: CommentCreate) -> Comment:
    comment = Comment(content=payload.content, post_id=post.id, user_id=user.id)
    db.add(comment)
    db.commit()
    return get_comment_or_404(db, comment.id)


def list_comments(db: Session, post_id: int) -> list[Comment]:
    query = (
        select(Comment)
        .options(joinedload(Comment.user))
        .where(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
    )
    return list(db.scalars(query).unique())


def get_comment_or_404(db: Session, comment_id: int) -> Comment:
    comment = db.scalar(select(Comment).options(joinedload(Comment.user)).where(Comment.id == comment_id))
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    return comment


def delete_comment(db: Session, comment: Comment, user: User) -> None:
    if comment.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only author can delete this comment")
    db.delete(comment)
    db.commit()
