import argparse
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

import app.db.base  # noqa: F401 — ensure all models are loaded
from app.db.session import SessionLocal
from app.models.user import User
from sqlalchemy import select


def promote(username: str) -> None:
    db = SessionLocal()
    try:
        u = db.scalar(select(User).where(User.username == username))
        if not u:
            print(f"用户 {username} 不存在")
            return
        u.role = "admin"
        db.add(u)
        db.commit()
        print(f"{u.username} 已提升为 admin")
    finally:
        db.close()


def demote(username: str) -> None:
    db = SessionLocal()
    try:
        u = db.scalar(select(User).where(User.username == username))
        if not u:
            print(f"用户 {username} 不存在")
            return
        u.role = "user"
        db.add(u)
        db.commit()
        print(f"{u.username} 已降级为 user")
    finally:
        db.close()


def delete_user(username: str) -> None:
    db = SessionLocal()
    try:
        u = db.scalar(select(User).where(User.username == username))
        if not u:
            print(f"用户 {username} 不存在")
            return
        db.delete(u)
        db.commit()
        print(f"{u.username} 已删除")
    finally:
        db.close()


def enable(username: str) -> None:
    db = SessionLocal()
    try:
        u = db.scalar(select(User).where(User.username == username))
        if not u:
            print(f"用户 {username} 不存在")
            return
        u.is_active = True
        db.add(u)
        db.commit()
        print(f"{u.username} 已启用")
    finally:
        db.close()


def disable(username: str) -> None:
    db = SessionLocal()
    try:
        u = db.scalar(select(User).where(User.username == username))
        if not u:
            print(f"用户 {username} 不存在")
            return
        u.is_active = False
        db.add(u)
        db.commit()
        print(f"{u.username} 已停用")
    finally:
        db.close()


def list_users() -> None:
    db = SessionLocal()
    try:
        users = list(db.scalars(select(User).order_by(User.id)))
        if not users:
            print("暂无用户")
            return
        print(f"{'ID':<6} {'用户名':<20} {'角色':<12} {'已验证':<8} {'状态':<8}")
        print("-" * 60)
        for u in users:
            verified = "是" if u.is_verified else "否"
            active = "启用" if u.is_active else "停用"
            print(f"{u.id:<6} {u.username:<20} {u.role:<12} {verified:<8} {active:<8}")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="博客管理工具")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("promote", help="提升用户为管理员")
    p.add_argument("username", help="用户名")

    d = sub.add_parser("demote", help="将管理员降级为普通用户")
    d.add_argument("username", help="用户名")

    e = sub.add_parser("enable", help="启用用户")
    e.add_argument("username", help="用户名")

    dis = sub.add_parser("disable", help="停用用户")
    dis.add_argument("username", help="用户名")

    rm = sub.add_parser("delete", help="删除用户")
    rm.add_argument("username", help="用户名")

    sub.add_parser("list-users", help="列出所有用户")

    args = parser.parse_args()

    if args.command == "promote":
        promote(args.username)
    elif args.command == "demote":
        demote(args.username)
    elif args.command == "enable":
        enable(args.username)
    elif args.command == "disable":
        disable(args.username)
    elif args.command == "delete":
        delete_user(args.username)
    elif args.command == "list-users":
        list_users()


if __name__ == "__main__":
    main()
