import re
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select, case, literal, text
from sqlalchemy.orm import Session, joinedload

from app.models.like import Like
from app.models.post import Post, PostStatus
from app.models.user import User
from app.schemas.post import PostCreate, PostUpdate


def _like_count_subquery():
    return (
        select(func.count(Like.id))
        .where(Like.target_type == "post", Like.target_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )


def _apply_sort(query, sort_by: str | None, like_count_sq):
    if sort_by == "views":
        return query.order_by(Post.view_count.desc())
    elif sort_by == "likes":
        return query.order_by(like_count_sq.desc())
    elif sort_by == "score":
        score = (
            func.extract("epoch", Post.created_at) / 10000.0 * 0.2
            + func.coalesce(like_count_sq, 0) * 0.5
            + Post.view_count * 0.3
        )
        return query.order_by(score.desc())
    else:
        return query.order_by(Post.created_at.desc())


def create_post(db: Session, author: User, payload: PostCreate) -> Post:
    post = Post(author_id=author.id, **payload.model_dump())
    if post.status == PostStatus.published.value:
        post.published_at = datetime.now(timezone.utc)
    db.add(post)
    db.commit()
    return get_post_or_404(db, post.id)


def list_posts(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    status_filter: str | None = None,
    user: User | None = None,
    author_id: int | None = None,
    sort_by: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> list[Post]:
    like_count_sq = _like_count_subquery()
    query = select(Post).options(joinedload(Post.author)).offset(skip).limit(limit)
    if status_filter:
        query = query.where(Post.status == status_filter)
        if status_filter == PostStatus.draft.value and (not user or user.role != "admin"):
            query = query.where(Post.author_id == user.id if user else 0)
    else:
        query = query.where(Post.status == PostStatus.published.value)
    if author_id is not None:
        query = query.where(Post.author_id == author_id)
    if date_from is not None:
        query = query.where(Post.created_at >= date_from)
    if date_to is not None:
        query = query.where(Post.created_at <= date_to)
    query = _apply_sort(query, sort_by, like_count_sq)
    return list(db.scalars(query).unique())


def search_posts(
    db: Session,
    keyword: str,
    skip: int = 0,
    limit: int = 20,
    sort_by: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    fuzzy: bool = False,
) -> list[Post]:
    words = keyword.split()
    like_count_sq = _like_count_subquery()
    query = (
        select(Post)
        .join(Post.author)
        .options(joinedload(Post.author))
        .where(Post.status == PostStatus.published.value)
        .offset(skip)
        .limit(limit)
    )
    if fuzzy:
        conditions = []
        for word in words:
            pattern = f"%{word}%"
            conditions.append(or_(
                Post.title.ilike(pattern),
                Post.summary.ilike(pattern),
                Post.content.ilike(pattern),
                func.array_to_string(Post.tags, ",").ilike(pattern),
                User.nickname.ilike(pattern),
                User.username.ilike(pattern),
            ))
        query = query.where(or_(*conditions))
    else:
        for word in words:
            escaped = re.escape(word)
            pattern = f"\\y{escaped}\\y"
            query = query.where(or_(
                Post.title.regexp_match(pattern, flags="i"),
                Post.summary.regexp_match(pattern, flags="i"),
                Post.content.regexp_match(pattern, flags="i"),
                func.array_to_string(Post.tags, ",").regexp_match(pattern, flags="i"),
                User.nickname.regexp_match(pattern, flags="i"),
                User.username.regexp_match(pattern, flags="i"),
            ))
    if date_from is not None:
        query = query.where(Post.created_at >= date_from)
    if date_to is not None:
        query = query.where(Post.created_at <= date_to)
    query = _apply_sort(query, sort_by, like_count_sq)
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
