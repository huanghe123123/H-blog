import re
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select, case, literal, text
from sqlalchemy.orm import Session, joinedload

from app.models.comment import Comment
from app.models.like import Like
from app.models.post import Post, PostCategory, PostStatus
from app.models.user import User
from app.schemas.post import PostCreate, PostUpdate


def _like_count_subquery():
    return (
        select(func.count(Like.id))
        .where(Like.target_type == "post", Like.target_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )


def _root_comment_count_subquery():
    return (
        select(func.count(Comment.id))
        .where(Comment.post_id == Post.id, Comment.parent_id == None)
        .correlate(Post)
        .scalar_subquery()
    )


def _reply_count_subquery():
    return (
        select(func.count(Comment.id))
        .where(Comment.post_id == Post.id, Comment.parent_id != None)
        .correlate(Post)
        .scalar_subquery()
    )


def _apply_sort(query, sort_by: str | None, like_count_sq, root_comment_count_sq, reply_count_sq):
    if sort_by == "views":
        return query.order_by(Post.view_count.desc())
    elif sort_by == "likes":
        return query.order_by(like_count_sq.desc())
    elif sort_by == "comments":
        total_comments = func.coalesce(root_comment_count_sq, 0) + func.coalesce(reply_count_sq, 0)
        return query.order_by(total_comments.desc())
    elif sort_by == "score":
        score = (
            func.extract("epoch", Post.created_at) / 10000.0 * 0.1
            + func.coalesce(like_count_sq, 0) * 0.35
            + func.coalesce(root_comment_count_sq, 0) * 0.35
            + func.coalesce(reply_count_sq, 0) * 0.35
            + Post.view_count * 0.2
        )
        return query.order_by(score.desc())
    else:
        return query.order_by(Post.created_at.desc())


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]*>", "", text).strip()


def _auto_summary(content: str, provided: str | None) -> str | None:
    if provided:
        return provided
    plain = _strip_html(content)
    if not plain:
        return None
    return plain[:15]


def create_post(db: Session, author: User, payload: PostCreate) -> Post:
    if payload.category == PostCategory.announcement and author.role not in ("moderator", "admin", "owner"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="只有版主及以上权限才能发布公告")
    post = Post(author_id=author.id, **payload.model_dump())
    post.summary = _auto_summary(post.content, post.summary)
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
    category: str | None = None,
) -> list[Post]:
    like_count_sq = _like_count_subquery()
    root_comment_count_sq = _root_comment_count_subquery()
    reply_count_sq = _reply_count_subquery()
    query = (
        select(Post, like_count_sq.label("like_count"), root_comment_count_sq.label("comment_count"), reply_count_sq.label("reply_count"))
        .options(joinedload(Post.author))
        .offset(skip)
        .limit(limit)
    )
    if status_filter:
        query = query.where(Post.status == status_filter)
        if status_filter == PostStatus.draft.value and (not user or user.role not in ("admin", "owner")):
            query = query.where(Post.author_id == user.id if user else 0)
    else:
        query = query.where(Post.status == PostStatus.published.value)
    if author_id is not None:
        query = query.where(Post.author_id == author_id)
    if date_from is not None:
        query = query.where(Post.created_at >= date_from)
    if date_to is not None:
        query = query.where(Post.created_at <= date_to)
    if category is not None:
        query = query.where(Post.category == category)
    query = _apply_sort(query, sort_by, like_count_sq, root_comment_count_sq, reply_count_sq)
    rows = db.execute(query).unique().all()
    posts = []
    for post, like_count, comment_count, reply_count in rows:
        post.like_count = like_count
        post.comment_count = comment_count
        post.reply_count = reply_count
        posts.append(post)
    return posts


def search_posts(
    db: Session,
    keyword: str,
    skip: int = 0,
    limit: int = 20,
    sort_by: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    fuzzy: bool = False,
    category: str | None = None,
) -> list[Post]:
    words = keyword.split()
    like_count_sq = _like_count_subquery()
    root_comment_count_sq = _root_comment_count_subquery()
    reply_count_sq = _reply_count_subquery()
    query = (
        select(Post, like_count_sq.label("like_count"), root_comment_count_sq.label("comment_count"), reply_count_sq.label("reply_count"))
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
                Post.category.ilike(pattern),
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
                Post.category.regexp_match(pattern, flags="i"),
                User.nickname.regexp_match(pattern, flags="i"),
                User.username.regexp_match(pattern, flags="i"),
            ))
    if date_from is not None:
        query = query.where(Post.created_at >= date_from)
    if date_to is not None:
        query = query.where(Post.created_at <= date_to)
    if category is not None:
        query = query.where(Post.category == category)
    query = _apply_sort(query, sort_by, like_count_sq, root_comment_count_sq, reply_count_sq)
    rows = db.execute(query).unique().all()
    posts = []
    for post, like_count, comment_count, reply_count in rows:
        post.like_count = like_count
        post.comment_count = comment_count
        post.reply_count = reply_count
        posts.append(post)
    return posts


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
    if post.author_id != user.id and user.role not in ("admin", "owner"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="只有作者或管理员可以编辑此文章")
    if payload.category is not None and payload.category == PostCategory.announcement and user.role not in ("moderator", "admin", "owner"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="只有版主及以上权限才能将文章设为公告")
    old_status = post.status
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(post, field, value)
    if not payload.summary and (payload.content is not None):
        post.summary = _auto_summary(post.content, None)
    if old_status != PostStatus.published.value and post.status == PostStatus.published.value:
        post.published_at = datetime.now(timezone.utc)
    db.add(post)
    db.commit()
    return get_post_or_404(db, post.id)


def delete_post(db: Session, post: Post, user: User) -> None:
    if post.author_id != user.id and user.role not in ("admin", "owner"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="只有作者或管理员可以删除此文章")
    db.delete(post)
    db.commit()
