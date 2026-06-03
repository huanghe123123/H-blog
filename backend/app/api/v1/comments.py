from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services.comments import delete_comment, get_comment_or_404

router = APIRouter(prefix="/comments", tags=["comments"])


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(comment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comment = get_comment_or_404(db, comment_id)
    delete_comment(db, comment, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
