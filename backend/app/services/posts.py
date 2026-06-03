from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.post import Post, PostStatus
from app.models.user import User
from app.schemas.post import PostCreate, PostUpdate


def create_post(db: Session, author: User, payload: PostCreate) -> Post:
    post = Post(author_id=author.id, **payload.model_dump())
    if post.status == PostStatus.published.value:
        post.published_at = datetime.now(timezone.utc)
    db.add(post)
    db.commit()
    return get_post_or_404(db, post.id)


def list_posts(
    db: Session, skip: int = 0, limit: int = 20, status_filter: str | None = None, user: User | None = None, author_id: int | None = None
) -> list[Post]:
    query = select(Post).options(joinedload(Post.author)).order_by(Post.created_at.desc()).offset(skip).limit(limit)
    if status_filter:
        query = query.where(Post.status == status_filter)
        if status_filter == PostStatus.draft.value and (not user or user.role != "admin"):
            query = query.where(Post.author_id == user.id if user else 0)
    else:
        query = query.where(Post.status == PostStatus.published.value)
    if author_id is not None:
        query = query.where(Post.author_id == author_id)
    return list(db.scalars(query).unique())


def search_posts(db: Session, keyword: str, skip: int = 0, limit: int = 20) -> list[Post]:
    pattern = f"%{keyword}%"
    query = (
        select(Post)
        .options(joinedload(Post.author))
        .where(
            Post.status == PostStatus.published.value,
            or_(Post.title.ilike(pattern), Post.summary.ilike(pattern), Post.content.ilike(pattern)),
        )
        .order_by(Post.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(db.scalars(query).unique())


def get_post_or_404(db: Session, post_id: int) -> Post:
    post = db.scalar(select(Post).options(joinedload(Post.author)).where(Post.id == post_id))
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


def get_post_detail(db: Session, post_id: int) -> Post:
    post = get_post_or_404(db, post_id)
    post.view_count += 1
    db.add(post)
    db.commit()
    db.refresh(post)
    return get_post_or_404(db, post_id)


def update_post(db: Session, post: Post, user: User, payload: PostUpdate) -> Post:
    if post.author_id != user.id and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="只有作者或管理员可以编辑此文章")
    old_status = post.status
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(post, field, value)
    if old_status != PostStatus.published.value and post.status == PostStatus.published.value:
        post.published_at = datetime.now(timezone.utc)
    db.add(post)
    db.commit()
    return get_post_or_404(db, post.id)


def delete_post(db: Session, post: Post, user: User) -> None:
    if post.author_id != user.id and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="只有作者或管理员可以删除此文章")
    db.delete(post)
    db.commit()
