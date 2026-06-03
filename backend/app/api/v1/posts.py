from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.post import PostStatus
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentPublic
from app.schemas.post import PostCreate, PostList, PostPublic, PostUpdate
from app.services.comments import create_comment, list_comments
from app.services.posts import create_post, delete_post, get_post_detail, get_post_or_404, list_posts, search_posts, update_post

router = APIRouter(prefix="/posts", tags=["posts"])


@router.post("", response_model=PostPublic, status_code=status.HTTP_201_CREATED)
def create(payload: PostCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return create_post(db, current_user, payload)


@router.get("", response_model=list[PostList])
def list_all(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: PostStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    return list_posts(db, skip=skip, limit=limit, status_filter=status_filter.value if status_filter else None)


@router.get("/search", response_model=list[PostList])
def search(keyword: str = Query(min_length=1), skip: int = 0, limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    return search_posts(db, keyword=keyword, skip=skip, limit=limit)


@router.get("/{post_id}", response_model=PostPublic)
def detail(post_id: int, db: Session = Depends(get_db)):
    return get_post_detail(db, post_id)


@router.put("/{post_id}", response_model=PostPublic)
def update(post_id: int, payload: PostUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = get_post_or_404(db, post_id)
    return update_post(db, post, current_user, payload)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = get_post_or_404(db, post_id)
    delete_post(db, post, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{post_id}/comments", response_model=CommentPublic, status_code=status.HTTP_201_CREATED)
def comment(post_id: int, payload: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = get_post_or_404(db, post_id)
    return create_comment(db, post, current_user, payload)


@router.get("/{post_id}/comments", response_model=list[CommentPublic])
def comments(post_id: int, db: Session = Depends(get_db)):
    get_post_or_404(db, post_id)
    return list_comments(db, post_id)
