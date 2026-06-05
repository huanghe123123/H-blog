from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.roles import UserRole
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import AdminUserItem, AdminUserDeleteResponse, UserRoleUpdate, UserStatusUpdate
from app.services.users import delete_user, get_user_or_404, list_users, set_user_role, set_user_status

router = APIRouter(prefix="/admin", tags=["admin"])


def _check_protected(actor: User, target: User, action: str):
    """Raise if the actor is not allowed to perform action on the target."""
    if target.role == UserRole.OWNER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"不能{action}站主")
    if actor.role != UserRole.OWNER and target.role == UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"不能{action}其他管理员")


@router.get("/users", response_model=list[AdminUserItem])
def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return list_users(db, skip=skip, limit=limit)


@router.patch("/users/{user_id}/role", response_model=AdminUserItem)
def update_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    user = get_user_or_404(db, user_id)
    _check_protected(_admin, user, "修改")
    return set_user_role(db, user, payload.role)


@router.patch("/users/{user_id}/status", response_model=AdminUserItem)
def update_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = get_user_or_404(db, user_id)
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="不能停用自己")
    _check_protected(admin, user, "停用")
    return set_user_status(db, user, payload.is_active)


@router.delete("/users/{user_id}", response_model=AdminUserDeleteResponse)
def remove_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="不能删除自己")
    user = get_user_or_404(db, user_id)
    _check_protected(admin, user, "删除")
    delete_user(db, user)
    return {"message": f"用户 {user.username} 已删除"}
